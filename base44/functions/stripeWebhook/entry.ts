/**
 * stripeWebhook — handles Stripe webhook events to sync subscription state
 * back into the user record after Checkout completes.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';
import { SecretsManagerClient, GetSecretValueCommand } from 'npm:@aws-sdk/client-secrets-manager@3.600.0';

const SECRET_ID = 'elitetc/prod/app';
let _secretsCache = null;
let _secretsCachedAt = 0;
const SECRETS_TTL_MS = 5 * 60 * 1000;

async function getAppSecrets() {
  const now = Date.now();
  if (_secretsCache && (now - _secretsCachedAt) < SECRETS_TTL_MS) return _secretsCache;
  try {
    const smClient = new SecretsManagerClient({
      region: Deno.env.get('AWS_REGION') || 'us-east-2',
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    const res = await smClient.send(new GetSecretValueCommand({ SecretId: SECRET_ID }));
    _secretsCache = JSON.parse(res.SecretString || '{}');
    _secretsCachedAt = now;
  } catch (err) {
    console.warn('[stripeWebhook] Secrets Manager unavailable, using env vars:', err.message);
    _secretsCache = {
      STRIPE_SECRET_KEY: Deno.env.get('STRIPE_SECRET_KEY'),
      STRIPE_WEBHOOK_SECRET: Deno.env.get('STRIPE_WEBHOOK_SECRET'),
    };
    _secretsCachedAt = now;
  }
  return _secretsCache;
}

const PLAN_META = {
  individual_monthly: { subscription_plan: 'individual', can_create_team: false },
  team_monthly: { subscription_plan: 'team', can_create_team: true },
};

Deno.serve(async (req) => {
  try {
    const secrets = await getAppSecrets();
    const stripe = new Stripe(secrets.STRIPE_SECRET_KEY || Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2023-10-16' });

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = secrets.STRIPE_WEBHOOK_SECRET || Deno.env.get('STRIPE_WEBHOOK_SECRET');

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