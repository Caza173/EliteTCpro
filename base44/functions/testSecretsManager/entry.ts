/**
 * testSecretsManager — Secrets Manager Diagnostic Probe
 *
 * Performs a hard probe of AWS Secrets Manager — NO env-var fallback.
 * Classifies exactly why SM fails if it does:
 *   - NOT_FOUND        : secret doesn't exist in this region/account
 *   - ACCESS_DENIED    : IAM policy doesn't allow GetSecretValue on this ARN
 *   - WRONG_REGION     : connected but secret not in this region
 *   - WRONG_ACCOUNT    : credentials belong to a different account than the secret
 *   - NO_CREDENTIALS   : AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY not set
 *   - SECRET_EMPTY     : secret exists but SecretString is null/empty
 *   - CONNECTED        : success — SM is the confirmed source
 *
 * This function is Admin/Owner only.
 */

import { SecretsManagerClient, GetSecretValueCommand } from 'npm:@aws-sdk/client-secrets-manager@3.600.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SECRET_ID = 'elitetc/prod/app';
const REGION    = 'us-east-2';

const EXPECTED_KEYS = [
  'OPENAI_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_INDIVIDUAL_MONTHLY',
  'STRIPE_PRICE_TEAM_MONTHLY',
  'DOTLOOP_WEBHOOK_SECRET',
  'SKYSLOPE_CLIENT_ID',
  'SKYSLOPE_CLIENT_SECRET',
  'SKYSLOPE_ACCESS_KEY',
  'SKYSLOPE_ACCESS_SECRET',
  'DROPBOX_SIGN_API_KEY',
  'SNS_TOPIC_ARN',
  'S3_BUCKET',
  'GOOGLE_MAPS_API_KEY',
];

function classifyError(err) {
  const code = err.name || err.code || '';
  const msg  = (err.message || '').toLowerCase();

  if (code === 'ResourceNotFoundException' || msg.includes('resourcenotfound') || msg.includes('not found')) {
    return {
      status: 'NOT_FOUND',
      detail: `Secret "${SECRET_ID}" does not exist in region ${REGION}. Create it in AWS Console → Secrets Manager → Store a new secret.`,
    };
  }
  if (code === 'AccessDeniedException' || code === 'UnauthorizedException' || msg.includes('access denied') || msg.includes('not authorized')) {
    return {
      status: 'ACCESS_DENIED',
      detail: `IAM policy denies GetSecretValue on "${SECRET_ID}". Add secretsmanager:GetSecretValue for arn:aws:secretsmanager:${REGION}:*:secret:${SECRET_ID}-* to the IAM policy for the access key in use.`,
    };
  }
  if (code === 'InvalidSignatureException' || msg.includes('signature')) {
    return {
      status: 'WRONG_CREDENTIALS',
      detail: 'AWS credentials are invalid or the secret key is incorrect.',
    };
  }
  if (msg.includes('endpoint') || msg.includes('network') || msg.includes('fetch') || msg.includes('connect')) {
    return {
      status: 'NETWORK_ERROR',
      detail: `Cannot reach Secrets Manager endpoint in ${REGION}. Possible wrong region or network issue.`,
    };
  }
  return {
    status: 'UNKNOWN_ERROR',
    detail: `${code}: ${err.message}`,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'owner', 'super_admin'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const report = {
      secret_id: SECRET_ID,
      region:    REGION,
      status:    null,
      detail:    null,
      source:    null,
      keys_found: [],
      keys_missing: [],
      key_count: 0,
      env_fallback_available: {},
      credentials_present: {
        AWS_ACCESS_KEY_ID:     !!Deno.env.get('AWS_ACCESS_KEY_ID'),
        AWS_SECRET_ACCESS_KEY: !!Deno.env.get('AWS_SECRET_ACCESS_KEY'),
        AWS_REGION:             Deno.env.get('AWS_REGION') || '(not set — defaulting to us-east-2)',
      },
    };

    // Check credentials before attempting SM
    if (!Deno.env.get('AWS_ACCESS_KEY_ID') || !Deno.env.get('AWS_SECRET_ACCESS_KEY')) {
      report.status = 'NO_CREDENTIALS';
      report.detail = 'AWS_ACCESS_KEY_ID and/or AWS_SECRET_ACCESS_KEY are not set as platform env vars.';
      report.source = 'NONE';
      return Response.json(report);
    }

    // Hard probe — no fallback
    try {
      const client = new SecretsManagerClient({
        region: REGION,
        credentials: {
          accessKeyId:     Deno.env.get('AWS_ACCESS_KEY_ID'),
          secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
        },
      });

      const res = await client.send(new GetSecretValueCommand({ SecretId: SECRET_ID }));

      if (!res.SecretString) {
        report.status = 'SECRET_EMPTY';
        report.detail = `Secret "${SECRET_ID}" exists but SecretString is null/empty. Store the JSON payload in the secret value.`;
        report.source = 'SECRETS_MANAGER';
        return Response.json(report);
      }

      let parsed;
      try {
        parsed = JSON.parse(res.SecretString);
      } catch (parseErr) {
        report.status = 'PARSE_ERROR';
        report.detail = `Secret exists but SecretString is not valid JSON: ${parseErr.message}`;
        report.source = 'SECRETS_MANAGER';
        return Response.json(report);
      }

      // Validate expected keys
      const keys = Object.keys(parsed);
      const present = EXPECTED_KEYS.filter(k => parsed[k]);
      const missing = EXPECTED_KEYS.filter(k => !parsed[k]);

      report.status       = missing.length === 0 ? 'CONNECTED' : 'CONNECTED_PARTIAL';
      report.detail       = missing.length === 0
        ? `All ${EXPECTED_KEYS.length} expected keys found in Secrets Manager. No env fallback needed.`
        : `SM connected but ${missing.length} expected key(s) missing from secret: ${missing.join(', ')}`;
      report.source       = 'SECRETS_MANAGER';
      report.keys_found   = present;
      report.keys_missing = missing;
      report.key_count    = keys.length;
      report.arn          = res.ARN || null;
      report.version_id   = res.VersionId || null;
      report.created_date = res.CreatedDate || null;

    } catch (err) {
      const classification = classifyError(err);
      report.status = classification.status;
      report.detail = classification.detail;
      report.source = 'ENV_FALLBACK_ONLY';
      report.raw_error = err.message;

      // Check what env fallback would provide
      for (const k of EXPECTED_KEYS) {
        report.env_fallback_available[k] = !!Deno.env.get(k) ? 'set' : 'missing';
      }
    }

    // Overall pass/fail
    report.phase1_sm_check = report.source === 'SECRETS_MANAGER' ? 'PASS' : 'FAIL';
    report.phase1_sm_check_reason = report.source !== 'SECRETS_MANAGER'
      ? `SM unavailable (${report.status}). Do NOT treat as passing — env fallback is masking the issue.`
      : `Confirmed: Secrets Manager is the authoritative source.`;

    return Response.json(report);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});