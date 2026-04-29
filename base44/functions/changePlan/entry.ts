/**
 * changePlan — upgrade or downgrade a user's Stripe subscription.
 * Upgrades take effect immediately (with proration).
 * Downgrades take effect at the end of the current billing cycle.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2023-10-16' });

const PRICE_IDS = {
  individual_monthly: Deno.env.get('STRIPE_PRICE_INDIVIDUAL_MONTHLY'),
  team_monthly: Deno.env.get('STRIPE_PRICE_TEAM_MONTHLY'),
};

const PLAN_META = {
  individual_monthly: { subscription_plan: 'individual', can_create_team: false },
  team_monthly: { subscription_plan: 'team', can_create_team: true },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan_id } = await req.json(); // 'individual_monthly' | 'team_monthly'

    if (!PRICE_IDS[plan_id]) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = PRICE_IDS[plan_id];
    if (!priceId) {
      return Response.json({ error: `Stripe price ID for ${plan_id} not configured` }, { status: 500 });
    }

    let customerId = user.stripe_customer_id;
    let subscriptionId = user.stripe_subscription_id;

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await base44.auth.updateMe({ stripe_customer_id: customerId });
    }

    const planMeta = PLAN_META[plan_id];
    const isUpgrade = plan_id === 'team_monthly';

    if (!subscriptionId) {
      // Create new subscription
      const sub = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
      subscriptionId = sub.id;
      await base44.auth.updateMe({
        stripe_subscription_id: subscriptionId,
        ...planMeta,
      });
      return Response.json({
        ok: true,
        client_secret: sub.latest_invoice?.payment_intent?.client_secret,
        subscription_id: subscriptionId,
      });
    }

    // Update existing subscription
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const itemId = sub.items.data[0]?.id;

    if (isUpgrade) {
      // Upgrade immediately with proration
      await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: 'create_prorations',
      });
    } else {
      // Downgrade at period end
      await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: 'none',
        billing_cycle_anchor: 'unchanged',
      });
    }

    // Update user record
    await base44.auth.updateMe(planMeta);

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[changePlan]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});