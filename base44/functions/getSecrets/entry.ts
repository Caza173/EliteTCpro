/**
 * getSecrets — AWS Secrets Manager helper
 *
 * Fetches all app secrets from AWS Secrets Manager at runtime.
 * Bootstrap credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) must
 * still be present as platform env vars — they are the ONLY env-level creds
 * required and have read-only access to Secrets Manager.
 *
 * Secret name : elitetc/prod/app
 * Region      : us-east-2
 *
 * This function is callable by other backend functions via:
 *   const res = await base44.functions.invoke('getSecrets', {});
 *   const { OPENAI_API_KEY, STRIPE_SECRET_KEY, ... } = res.data;
 */

import { SecretsManagerClient, GetSecretValueCommand } from 'npm:@aws-sdk/client-secrets-manager@3.600.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SECRET_ID = 'elitetc/prod/app';
const REGION = 'us-east-2';

// Module-level cache — persists across warm invocations within the same isolate
let _cachedSecrets = null;
let _cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchFromSecretsManager() {
  const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Bootstrap AWS credentials missing. AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set as platform env vars.');
  }

  const client = new SecretsManagerClient({
    region: REGION,
    credentials: { accessKeyId, secretAccessKey },
  });

  const response = await client.send(
    new GetSecretValueCommand({ SecretId: SECRET_ID })
  );

  if (!response.SecretString) {
    throw new Error(`Secret "${SECRET_ID}" has no SecretString value`);
  }

  return JSON.parse(response.SecretString);
}

async function getSecretsCached() {
  const now = Date.now();
  if (_cachedSecrets && (now - _cachedAt) < CACHE_TTL_MS) {
    return _cachedSecrets;
  }

  // Fall back gracefully to env vars if Secrets Manager is not yet configured
  let smSecrets = {};
  try {
    smSecrets = await fetchFromSecretsManager();
    console.log('[getSecrets] Loaded from Secrets Manager:', Object.keys(smSecrets).join(', '));
  } catch (err) {
    console.warn('[getSecrets] Secrets Manager unavailable, falling back to env vars:', err.message);
    // Return env-var values so existing functions continue working during migration
    smSecrets = {
      OPENAI_API_KEY:          Deno.env.get('OPENAI_API_KEY')          || null,
      STRIPE_SECRET_KEY:       Deno.env.get('STRIPE_SECRET_KEY')       || null,
      STRIPE_WEBHOOK_SECRET:   Deno.env.get('STRIPE_WEBHOOK_SECRET')   || null,
      STRIPE_PRICE_INDIVIDUAL_MONTHLY: Deno.env.get('STRIPE_PRICE_INDIVIDUAL_MONTHLY') || null,
      STRIPE_PRICE_TEAM_MONTHLY:       Deno.env.get('STRIPE_PRICE_TEAM_MONTHLY')       || null,
      DOTLOOP_WEBHOOK_SECRET:  Deno.env.get('DOTLOOP_WEBHOOK_SECRET')  || null,
      SKYSLOPE_CLIENT_ID:      Deno.env.get('SKYSLOPE_CLIENT_ID')      || null,
      SKYSLOPE_CLIENT_SECRET:  Deno.env.get('SKYSLOPE_CLIENT_SECRET')  || null,
      SKYSLOPE_ACCESS_KEY:     Deno.env.get('SKYSLOPE_ACCESS_KEY')     || null,
      SKYSLOPE_ACCESS_SECRET:  Deno.env.get('SKYSLOPE_ACCESS_SECRET')  || null,
      DROPBOX_SIGN_API_KEY:    Deno.env.get('DROPBOX_SIGN_API_KEY')    || null,
      SNS_TOPIC_ARN:           Deno.env.get('SNS_TOPIC_ARN')           || null,
      S3_BUCKET:               Deno.env.get('S3_BUCKET')               || null,
      GOOGLE_MAPS_API_KEY:     Deno.env.get('GOOGLE_MAPS_API_KEY')     || null,
    };
  }

  // Always merge AWS region + S3 bucket from env (infrastructure-level, not secret)
  smSecrets.AWS_REGION = Deno.env.get('AWS_REGION') || 'us-east-2';
  smSecrets.S3_BUCKET  = smSecrets.S3_BUCKET || Deno.env.get('S3_BUCKET') || 'elitetc-documents';

  _cachedSecrets = smSecrets;
  _cachedAt = now;
  return smSecrets;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only admins/owners can invoke this endpoint directly
    const ADMIN_ROLES = ['admin', 'owner', 'super_admin'];
    if (!ADMIN_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const secrets = await getSecretsCached();

    // NEVER return the actual secret values over the wire — only return which keys are present
    const keyStatus = Object.fromEntries(
      Object.entries(secrets).map(([k, v]) => [k, v ? 'set' : 'missing'])
    );

    return Response.json({
      success: true,
      secret_id: SECRET_ID,
      region: REGION,
      cache_age_ms: Date.now() - _cachedAt,
      keys: keyStatus,
    });

  } catch (error) {
    console.error('[getSecrets] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Named export for internal function-to-function use
export { getSecretsCached as getSecrets };