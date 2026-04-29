/**
 * stripeWebhook — handles Stripe webhook events to sync subscription state
 * back into the user record after Checkout completes.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2023-10-16' });

const PLAN_META = {
  individual_monthly: { subscription_plan: 'individual', can_create_team: false },
  team_monthly: { subscription_plan: 'team', can_create_team: true },
};

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    let event;
    if (webhookSecret && sig) {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    const base44 = createClientFromRequest(req);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const planId = session.metadata?.plan_id;
      const subscriptionId = session.subscription;

      if (userId && planId && subscriptionId) {
        const planMeta = PLAN_META[planId] || {};
        // Update user record with new subscription info
        await base44.asServiceRole.entities.User.update(userId, {
          stripe_subscription_id: subscriptionId,
          ...planMeta,
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const userId = sub.metadata?.user_id;
      if (userId) {
        await base44.asServiceRole.entities.User.update(userId, {
          stripe_subscription_id: null,
          subscription_plan: null,
          can_create_team: false,
        });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[stripeWebhook]', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
});