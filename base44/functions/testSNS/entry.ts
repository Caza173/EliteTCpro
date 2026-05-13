/**
 * EliteTC — AWS SNS Test Endpoint
 * ─────────────────────────────────────────────────────────────────────────────
 * Route: POST /api/test/sns  (invoke via base44.functions.invoke('testSNS', payload))
 *
 * Sends a test SNS message to validate environment config.
 * Admin-only. Infrastructure test only — not connected to any live workflow.
 *
 * FUTURE INTEGRATION POINTS (do NOT implement yet):
 *   • Deadline engine   → import publishDeadlineAlert logic into functions/deadlineEngine.js
 *   • Compliance engine → import publishComplianceAlert logic into functions/complianceEngine.js
 *   • Scheduled alerts  → add publishDeadlineAlert calls in functions/sendDeadlineAlerts.js
 *   • Transaction hooks → add publishSystemAlert in functions/createTransaction.js on status change
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";
import { SNSClient, PublishCommand } from "npm:@aws-sdk/client-sns@3";

// ─── Environment Validation ───────────────────────────────────────────────────

const REQUIRED_ENV_VARS = ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "SNS_TOPIC_ARN"];

function validateSNSEnv() {
  const missing = REQUIRED_ENV_VARS.filter((k) => !Deno.env.get(k));
  return { valid: missing.length === 0, missing };
}

// ─── SNS Client Factory ───────────────────────────────────────────────────────
// Returns null (with warning) if env vars are missing — never throws.

function createSNSClient() {
  const { valid, missing } = validateSNSEnv();
  if (!valid) {
    console.warn(`[SNS] Missing env vars: ${missing.join(", ")}. SNS disabled.`);
    return null;
  }
  return new SNSClient({
    region: Deno.env.get("AWS_REGION"),
    credentials: {
      accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID"),
      secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY"),
    },
  });
}

// ─── Generic Publisher ────────────────────────────────────────────────────────
// All alert types share this internal function to avoid duplication.

async function publishMessage(client, subject, payload) {
  const message = JSON.stringify({
    ...payload,
    _publishedAt: new Date().toISOString(),
  });

  const command = new PublishCommand({
    TopicArn: Deno.env.get("SNS_TOPIC_ARN"),
    Subject: subject.slice(0, 100), // SNS subject max = 100 chars
    Message: message,
  });

  const result = await client.send(command);
  console.log(`[SNS] Published "${subject}" — MessageId: ${result.MessageId}`);
  return { success: true, messageId: result.MessageId };
}

// ─── Typed Alert Helpers ──────────────────────────────────────────────────────
// These match the intended public API in snsService.js

/**
 * publishDeadlineAlert — future hook point for functions/deadlineEngine.js
 * Payload: { transactionId, propertyAddress, deadlineType, dueDate, severity, assignedUser, createdAt }
 */
async function publishDeadlineAlert(client, payload) {
  const subject = `EliteTC Deadline Alert — ${payload.deadlineType || "Unknown"} [${payload.severity || "notice"}]`;
  return publishMessage(client, subject, { alertType: "deadline", ...payload });
}

/**
 * publishComplianceAlert — future hook point for functions/complianceEngine.js
 * Payload: { transactionId, propertyAddress, ruleId, severity, message, assignedUser, createdAt }
 */
async function publishComplianceAlert(client, payload) {
  const subject = `EliteTC Compliance Alert — ${payload.ruleId || "Unknown Rule"} [${payload.severity || "warning"}]`;
  return publishMessage(client, subject, { alertType: "compliance", ...payload });
}

/**
 * publishSystemAlert — future hook point for general transaction/status events
 * Payload: { event, transactionId?, propertyAddress?, details, assignedUser?, createdAt }
 */
async function publishSystemAlert(client, payload) {
  const subject = `EliteTC System Alert — ${payload.event || "Event"}`;
  return publishMessage(client, subject, { alertType: "system", ...payload });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin/owner guard
    const user = await base44.auth.me();
    if (!user || !["admin", "owner"].includes(user.role)) {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Validate environment
    const { valid, missing } = validateSNSEnv();
    if (!valid) {
      return Response.json({
        success: false,
        error: "SNS environment not configured",
        missing,
      }, { status: 503 });
    }

    const client = createSNSClient();

    const testPayload = {
      transactionId: "TEST-001",
      propertyAddress: "123 EliteTC Test Lane, NH",
      deadlineType: "inspection",
      dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      severity: "notice",
      assignedUser: user.email,
      createdAt: new Date().toISOString(),
      _note: "Infrastructure test message — not a live alert",
    };

    const result = await publishDeadlineAlert(client, testPayload);

    return Response.json({
      success: result.success,
      messageId: result.messageId ?? null,
      testedBy: user.email,
      testedAt: new Date().toISOString(),
      region: Deno.env.get("AWS_REGION"),
      topicArn: Deno.env.get("SNS_TOPIC_ARN"),
    });
  } catch (error) {
    console.error("[SNS Test] Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});