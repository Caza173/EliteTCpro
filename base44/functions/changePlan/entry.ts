/**
 * changePlan — creates a Stripe Checkout Session for new subscriptions,
 * or updates an existing active subscription (upgrade/downgrade).
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

    const { plan_id, success_url, cancel_url } = await req.json();

    if (!PRICE_IDS[plan_id]) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = PRICE_IDS[plan_id];
    if (!priceId) {
      return Response.json({ error: `Stripe price ID for ${plan_id} not configured` }, { status: 500 });
    }

    const planMeta = PLAN_META[plan_id];
    const isUpgrade = plan_id === 'team_monthly';

    // Ensure Stripe customer exists
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await base44.auth.updateMe({ stripe_customer_id: customerId });
    }

    const subscriptionId = user.stripe_subscription_id;

    // If there's an existing subscription, check if it's active and just update it
    if (subscriptionId) {
      let sub;
      try {
        sub = await stripe.subscriptions.retrieve(subscriptionId);
      } catch (_) {
        sub = null;
      }

      if (sub && sub.status === 'active') {
        // Update existing active subscription (upgrade or downgrade)
        const itemId = sub.items.data[0]?.id;
        if (isUpgrade) {
          await stripe.subscriptions.update(subscriptionId, {
            items: [{ id: itemId, price: priceId }],
            proration_behavior: 'create_prorations',
          });
        } else {
          await stripe.subscriptions.update(subscriptionId, {
            items: [{ id: itemId, price: priceId }],
            proration_behavior: 'none',
            billing_cycle_anchor: 'unchanged',
          });
        }
        await base44.auth.updateMe(planMeta);
        return Response.json({ ok: true });
      }

      // If subscription is incomplete or expired, cancel it and fall through to checkout
      if (sub && (sub.status === 'incomplete' || sub.status === 'incomplete_expired')) {
        await stripe.subscriptions.cancel(subscriptionId);
        await base44.auth.updateMe({ stripe_subscription_id: null });
      }
    }

    // No active subscription — create a Stripe Checkout Session to collect payment
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url || 'https://app.base44.com/Billing?success=1',
      cancel_url: cancel_url || 'https://app.base44.com/Billing?canceled=1',
      metadata: {
        user_id: user.id,
        plan_id,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_id,
        },
      },
    });

    return Response.json({ ok: true, checkout_url: session.url });
  } catch (error) {
    console.error('[changePlan]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});