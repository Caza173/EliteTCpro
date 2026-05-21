/**
 * cwAlarms — Provision CloudWatch Metric Filters + Alarms
 *
 * Creates metric filters on CloudWatch log groups to detect errors,
 * then creates CloudWatch Alarms tied to those metrics with SNS alerts.
 *
 * Alarms configured:
 *   1. Textract failures        — >3 failures in 5 minutes → /elitetc/ocr
 *   2. GPT parse zero-field     — parsed fields = 0 or null → /elitetc/parsing
 *   3. Deadline engine failures — any ERROR in deadline runs → /elitetc/deadlines
 *   4. Compliance sig blocking  — signature blocking failures → /elitetc/compliance
 *   5. Auth spikes              — 401/403 errors > threshold → /elitetc/auth
 *   6. Notification failures    — errors in notification engine → /elitetc/notifications
 */

import {
  CloudWatchClient,
  PutMetricAlarmCommand,
  PutMetricFilterCommand as _PutMetricFilterCommand,
} from 'npm:@aws-sdk/client-cloudwatch@3.600.0';
import {
  CloudWatchLogsClient,
  PutMetricFilterCommand,
} from 'npm:@aws-sdk/client-cloudwatch-logs@3.600.0';
import { SecretsManagerClient, GetSecretValueCommand } from 'npm:@aws-sdk/client-secrets-manager@3.600.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const REGION = Deno.env.get('AWS_REGION') || 'us-east-2';
const SECRET_ID = 'elitetc/prod/app';

let _secretsCache = null;
let _secretsCachedAt = 0;
const SECRETS_TTL_MS = 5 * 60 * 1000;

async function getAppSecrets() {
  const now = Date.now();
  if (_secretsCache && (now - _secretsCachedAt) < SECRETS_TTL_MS) return _secretsCache;
  try {
    const smClient = new SecretsManagerClient({
      region: REGION,
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    const res = await smClient.send(new GetSecretValueCommand({ SecretId: SECRET_ID }));
    _secretsCache = JSON.parse(res.SecretString || '{}');
    _secretsCachedAt = now;
  } catch (err) {
    console.warn('[cwAlarms] Secrets Manager unavailable:', err.message);
    _secretsCache = {};
    _secretsCachedAt = now;
  }
  return _secretsCache;
}

function getAWSCredentials() {
  return {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
  };
}

// ── Metric filter + alarm definitions ────────────────────────────────────────

function getAlarmDefinitions(snsTopicArn) {
  return [
    {
      name: 'EliteTC-Textract-Failures',
      description: 'Textract OCR failures — >3 in 5 minutes',
      logGroup: '/elitetc/ocr',
      filterName: 'TextractFailures',
      filterPattern: '{ $.level = "ERROR" && $.service = "textractDocument" }',
      metricNamespace: 'EliteTC/OCR',
      metricName: 'TextractErrors',
      threshold: 3,
      evaluationPeriods: 1,
      period: 300, // 5 minutes
      comparisonOperator: 'GreaterThanThreshold',
      treatMissingData: 'notBreaching',
      alarmActions: snsTopicArn ? [snsTopicArn] : [],
    },
    {
      name: 'EliteTC-GPT-Parse-Zero-Fields',
      description: 'GPT parse returned 0 fields or null response',
      logGroup: '/elitetc/parsing',
      filterName: 'GPTParseZeroFields',
      filterPattern: '{ $.level = "ERROR" && $.service = "parsePurchaseAgreementV2" }',
      metricNamespace: 'EliteTC/Parsing',
      metricName: 'GPTParseErrors',
      threshold: 1,
      evaluationPeriods: 1,
      period: 300,
      comparisonOperator: 'GreaterThanOrEqualToThreshold',
      treatMissingData: 'notBreaching',
      alarmActions: snsTopicArn ? [snsTopicArn] : [],
    },
    {
      name: 'EliteTC-Deadline-Engine-Failures',
      description: 'Deadline engine scheduled scan failures',
      logGroup: '/elitetc/deadlines',
      filterName: 'DeadlineEngineErrors',
      filterPattern: '{ $.level = "ERROR" && $.service = "deadlineEngine" }',
      metricNamespace: 'EliteTC/Deadlines',
      metricName: 'DeadlineEngineErrors',
      threshold: 1,
      evaluationPeriods: 1,
      period: 300,
      comparisonOperator: 'GreaterThanOrEqualToThreshold',
      treatMissingData: 'notBreaching',
      alarmActions: snsTopicArn ? [snsTopicArn] : [],
    },
    {
      name: 'EliteTC-Compliance-Signature-Block-Failures',
      description: 'Compliance signature blocking automation failures',
      logGroup: '/elitetc/compliance',
      filterName: 'ComplianceSigBlockErrors',
      filterPattern: '{ $.level = "ERROR" && $.service = "complianceEngine" }',
      metricNamespace: 'EliteTC/Compliance',
      metricName: 'ComplianceErrors',
      threshold: 2,
      evaluationPeriods: 1,
      period: 300,
      comparisonOperator: 'GreaterThanOrEqualToThreshold',
      treatMissingData: 'notBreaching',
      alarmActions: snsTopicArn ? [snsTopicArn] : [],
    },
    {
      name: 'EliteTC-Auth-Spike',
      description: 'Auth 401/403 error spike — potential unauthorized access',
      logGroup: '/elitetc/auth',
      filterName: 'AuthErrors',
      filterPattern: '{ $.level = "WARN" && $.context.status_code >= 401 }',
      metricNamespace: 'EliteTC/Auth',
      metricName: 'AuthErrors',
      threshold: 10,
      evaluationPeriods: 1,
      period: 300,
      comparisonOperator: 'GreaterThanThreshold',
      treatMissingData: 'notBreaching',
      alarmActions: snsTopicArn ? [snsTopicArn] : [],
    },
    {
      name: 'EliteTC-Notification-Engine-Failures',
      description: 'Notification engine critical errors',
      logGroup: '/elitetc/notifications',
      filterName: 'NotificationErrors',
      filterPattern: '{ $.level = "ERROR" && $.service = "notificationEngine" }',
      metricNamespace: 'EliteTC/Notifications',
      metricName: 'NotificationErrors',
      threshold: 1,
      evaluationPeriods: 1,
      period: 300,
      comparisonOperator: 'GreaterThanOrEqualToThreshold',
      treatMissingData: 'notBreaching',
      alarmActions: snsTopicArn ? [snsTopicArn] : [],
    },
  ];
}

// ── Provision metric filter on a log group ─────────────────────────────────────
async function putMetricFilter(cwLogsClient, def) {
  try {
    await cwLogsClient.send(new PutMetricFilterCommand({
      logGroupName: def.logGroup,
      filterName: def.filterName,
      filterPattern: def.filterPattern,
      metricTransformations: [
        {
          metricName: def.metricName,
          metricNamespace: def.metricNamespace,
          metricValue: '1',
          defaultValue: 0,
          unit: 'Count',
        },
      ],
    }));
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

// ── Provision CloudWatch Alarm ─────────────────────────────────────────────────
async function putAlarm(cwClient, def) {
  try {
    await cwClient.send(new PutMetricAlarmCommand({
      AlarmName: def.name,
      AlarmDescription: def.description,
      MetricName: def.metricName,
      Namespace: def.metricNamespace,
      Statistic: 'Sum',
      Period: def.period,
      EvaluationPeriods: def.evaluationPeriods,
      Threshold: def.threshold,
      ComparisonOperator: def.comparisonOperator,
      TreatMissingData: def.treatMissingData,
      AlarmActions: def.alarmActions,
      OKActions: def.alarmActions,
      ActionsEnabled: def.alarmActions.length > 0,
    }));
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin' && user?.role !== 'owner') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const secrets = await getAppSecrets();
    const snsTopicArn = secrets.SNS_TOPIC_ARN || Deno.env.get('SNS_TOPIC_ARN');

    const credentials = getAWSCredentials();
    const cwLogsClient = new CloudWatchLogsClient({ region: REGION, credentials });
    const cwClient = new CloudWatchClient({ region: REGION, credentials });

    const definitions = getAlarmDefinitions(snsTopicArn);
    const results = {};

    for (const def of definitions) {
      const filterResult = await putMetricFilter(cwLogsClient, def);
      const alarmResult = await putAlarm(cwClient, def);
      results[def.name] = {
        metric_filter: filterResult,
        alarm: alarmResult,
        log_group: def.logGroup,
        threshold: def.threshold,
        period_seconds: def.period,
        sns_configured: !!snsTopicArn,
      };
      console.log(`[cwAlarms] Provisioned: ${def.name} — filter:${filterResult.status} alarm:${alarmResult.status}`);
    }

    const allOk = Object.values(results).every(r => r.metric_filter.status === 'ok' && r.alarm.status === 'ok');

    return Response.json({
      success: allOk,
      alarms_provisioned: definitions.length,
      sns_topic_arn: snsTopicArn || '(not configured)',
      results,
      alarm_thresholds: {
        textract_failures: '>3 errors in 5 minutes',
        gpt_parse_errors: '>=1 error in 5 minutes',
        deadline_engine_errors: '>=1 error in 5 minutes',
        compliance_sig_block_errors: '>=2 errors in 5 minutes',
        auth_spikes: '>10 auth errors in 5 minutes',
        notification_errors: '>=1 error in 5 minutes',
      },
      recipients: snsTopicArn ? 'SNS topic subscribers' : 'None — SNS_TOPIC_ARN not configured',
    });

  } catch (error) {
    console.error('[cwAlarms] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});