/**
 * cwLogger — Shared CloudWatch structured logging utility
 *
 * Provisions log groups and writes structured JSON log events to CloudWatch Logs.
 * Also exposes createLogger() for use inside other backend functions.
 *
 * Log Groups:
 *   /elitetc/api          — General API endpoint logs
 *   /elitetc/parsing      — GPT parsing pipeline
 *   /elitetc/compliance   — Compliance engine
 *   /elitetc/auth         — Auth events, 401/403 spikes
 *   /elitetc/deadlines    — Deadline engine runs
 *   /elitetc/notifications — Notification engine runs
 *   /elitetc/ocr          — Textract OCR pipeline
 */

import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
  DescribeLogStreamsCommand,
} from 'npm:@aws-sdk/client-cloudwatch-logs@3.600.0';
import { SecretsManagerClient, GetSecretValueCommand } from 'npm:@aws-sdk/client-secrets-manager@3.600.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LOG_GROUPS = [
  '/elitetc/api',
  '/elitetc/parsing',
  '/elitetc/compliance',
  '/elitetc/auth',
  '/elitetc/deadlines',
  '/elitetc/notifications',
  '/elitetc/ocr',
];

const REGION = Deno.env.get('AWS_REGION') || 'us-east-2';

function getAWSCredentials() {
  return {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
  };
}

function getCWClient() {
  return new CloudWatchLogsClient({ region: REGION, credentials: getAWSCredentials() });
}

// ── Generate correlation ID ───────────────────────────────────────────────────
export function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ── Structured log entry builder ──────────────────────────────────────────────
export function buildLogEntry({ level, service, message, request_id, transaction_id, owner_user_id, document_id, context = {} }) {
  return {
    timestamp: new Date().toISOString(),
    level: level || 'INFO',
    service: service || 'unknown',
    request_id: request_id || null,
    transaction_id: transaction_id || null,
    owner_user_id: owner_user_id || null,
    document_id: document_id || null,
    message,
    context,
  };
}

// ── In-process log buffer per request ────────────────────────────────────────
export function createLogger({ service, request_id, transaction_id, owner_user_id, document_id, logGroup }) {
  const buffer = [];

  function log(level, message, context = {}) {
    const entry = buildLogEntry({ level, service, message, request_id, transaction_id, owner_user_id, document_id, context });
    buffer.push(entry);
    // Mirror to Deno console for platform log visibility
    const fn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
    fn(`[${service}][${level}][${request_id}] ${message}`, Object.keys(context).length ? context : '');
  }

  return {
    info:  (msg, ctx) => log('INFO',  msg, ctx),
    warn:  (msg, ctx) => log('WARN',  msg, ctx),
    error: (msg, ctx) => log('ERROR', msg, ctx),
    debug: (msg, ctx) => log('DEBUG', msg, ctx),
    getBuffer: () => buffer,
    logGroup,
  };
}

// ── Flush buffered logs to CloudWatch ─────────────────────────────────────────
export async function flushLogs(logger) {
  const buffer = logger.getBuffer();
  if (!buffer.length) return;

  const logGroup = logger.logGroup;
  if (!logGroup) return;

  const cwClient = getCWClient();
  const streamName = `${new Date().toISOString().slice(0, 10)}-${logger.getBuffer()[0]?.context?.request_id || 'default'}`;

  try {
    // Ensure stream exists
    try {
      await cwClient.send(new CreateLogStreamCommand({ logGroupName: logGroup, logStreamName: streamName }));
    } catch (e) {
      if (!e.name?.includes('AlreadyExists')) throw e;
    }

    // Get sequence token if stream has prior events
    let sequenceToken;
    try {
      const streams = await cwClient.send(new DescribeLogStreamsCommand({
        logGroupName: logGroup,
        logStreamNamePrefix: streamName,
        limit: 1,
      }));
      sequenceToken = streams.logStreams?.[0]?.uploadSequenceToken;
    } catch (_) {}

    const events = buffer.map(entry => ({
      timestamp: new Date(entry.timestamp).getTime(),
      message: JSON.stringify(entry),
    })).sort((a, b) => a.timestamp - b.timestamp);

    const cmd = new PutLogEventsCommand({
      logGroupName: logGroup,
      logStreamName: streamName,
      logEvents: events,
      ...(sequenceToken ? { sequenceToken } : {}),
    });

    await cwClient.send(cmd);
  } catch (err) {
    console.warn(`[cwLogger] Failed to flush logs to ${logGroup}:`, err.message);
  }
}

// ── Provision all log groups (idempotent) ─────────────────────────────────────
async function provisionLogGroups() {
  const cwClient = getCWClient();
  const results = {};

  for (const group of LOG_GROUPS) {
    try {
      await cwClient.send(new CreateLogGroupCommand({
        logGroupName: group,
        tags: { Project: 'EliteTC', Environment: 'prod', ManagedBy: 'cwLogger' },
      }));
      results[group] = 'created';
    } catch (e) {
      if (e.name === 'ResourceAlreadyExistsException') {
        results[group] = 'already_exists';
      } else {
        results[group] = `error: ${e.message}`;
      }
    }
  }

  return results;
}

// ── Main handler — admin-only, provisions all log groups ─────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin' && user?.role !== 'owner') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const logGroupResults = await provisionLogGroups();
    const successCount = Object.values(logGroupResults).filter(v => v === 'created' || v === 'already_exists').length;

    console.log('[cwLogger] Log group provisioning complete:', logGroupResults);

    return Response.json({
      success: true,
      log_groups: logGroupResults,
      total: LOG_GROUPS.length,
      ready: successCount,
      message: 'All CloudWatch log groups provisioned',
    });

  } catch (error) {
    console.error('[cwLogger] Provisioning error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});