import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TRANSACTION_RISK_KEYWORDS = [
  "deadline", "closing", "calendar sync", "compliance", "signature", "initials",
  "document parser", "parsing", "email notification", "task not saving", "delete",
  "revert", "missed date", "wrong phase", "earnest money", "inspection deadline",
  "appraisal", "financing", "clear to close", "ctc",
];

function hasTransactionRisk(text) {
  const lower = (text || "").toLowerCase();
  return TRANSACTION_RISK_KEYWORDS.some(k => lower.includes(k));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both direct calls (feedback_item_id) and entity automation payload (event.entity_id or data.id)
    const feedback_item_id = body.feedback_item_id || body.event?.entity_id || body.data?.id;

    if (!feedback_item_id) return Response.json({ error: "feedback_item_id required" }, { status: 400 });

    const items = await base44.asServiceRole.entities.FeedbackItem.filter({ id: feedback_item_id });
    const item = items[0];
    if (!item) return Response.json({ error: "FeedbackItem not found" }, { status: 404 });

    // Fetch existing items for duplicate detection
    const allItems = await base44.asServiceRole.entities.FeedbackItem.list("-created_date", 200);
    const otherItems = allItems.filter(i => i.id !== item.id);

    // Build duplicate context
    const duplicateSummaries = otherItems.slice(0, 50).map(i =>
      `ID:${i.id} TYPE:${i.type} TITLE:"${i.title}" MODULE:${i.module || ""} PLATFORM:${i.requested_platform || ""}`
    ).join("\n");

    const prompt = `You are an internal triage AI for EliteTC, a real estate transaction management platform.

Analyze this feedback submission and return a JSON object.

FEEDBACK ITEM:
- ID: ${item.id}
- Type: ${item.type}
- Title: "${item.title}"
- Description: "${item.description}"
- Expected Behavior: "${item.expected_behavior || ""}"
- Module: "${item.module || ""}"
- Severity: "${item.severity || ""}"
- Requested Platform: "${item.requested_platform || ""}"
- Transaction ID: "${item.transaction_id || ""}"
- Transaction Address: "${item.transaction_address || ""}"
- Value Tags: ${JSON.stringify(item.value_tags || [])}

EXISTING ITEMS FOR DUPLICATE DETECTION (title + module only):
${duplicateSummaries}

INSTRUCTIONS:
1. ai_summary: Write a short, plain-English internal summary (1-2 sentences max).
2. ai_category: One of: bug, feature, integration, question, duplicate, unclear
3. ai_priority_score (1-100): Use these rules:
   - 90-100: Critical blocker, deadline/compliance/signature/parser/calendar sync failure, data loss risk
   - 70-89: Major workflow failure, email/doc/timeline issue, repeated pain
   - 40-69: Useful improvement, non-blocking, moderate friction
   - 1-39: Low urgency, minor UX, edge case
   IMPORTANT: Score transaction-risk issues aggressively higher.
4. ai_impact_score (1-100): Considers breadth of impact across users/roles/transactions/compliance.
5. ai_urgency_reason: Short phrase like "Blocks transaction progress" or "Creates missed deadline risk"
6. ai_tags: Array of relevant internal tags from: deadlines, compliance, documents, parser, calendar, email, AI assistant, mobile, UX, transaction page, integration request, CRM, accounting, high-risk, tasks, notifications, signatures
7. ai_similar_item_ids: Array of IDs from the existing items list that are likely duplicates (same issue, same platform, similar description). Empty array if none.
8. is_duplicate: true if you are highly confident this is a duplicate of an existing item.

Return ONLY valid JSON. No markdown, no explanation.

{
  "ai_summary": "...",
  "ai_category": "...",
  "ai_priority_score": 0,
  "ai_impact_score": 0,
  "ai_urgency_reason": "...",
  "ai_tags": [],
  "ai_similar_item_ids": [],
  "is_duplicate": false
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          ai_summary: { type: "string" },
          ai_category: { type: "string" },
          ai_priority_score: { type: "number" },
          ai_impact_score: { type: "number" },
          ai_urgency_reason: { type: "string" },
          ai_tags: { type: "array", items: { type: "string" } },
          ai_similar_item_ids: { type: "array", items: { type: "string" } },
          is_duplicate: { type: "boolean" },
        },
      },
    });

    // Determine flags
    const combinedText = `${item.title} ${item.description} ${item.module || ""} ${item.expected_behavior || ""}`;
    const isTransactionRisk = hasTransactionRisk(combinedText) && item.type === "bug";
    const isUrgent = result.ai_priority_score >= 90 || (item.type === "bug" && item.severity === "critical");

    // Roadmap/integration candidate: check similar counts
    const similarCount = (result.ai_similar_item_ids || []).length;
    const isRoadmapCandidate = item.type === "feature" && similarCount >= 2;
    const isIntegrationCandidate = item.type === "integration" && similarCount >= 2;

    const updates = {
      ai_summary: result.ai_summary,
      ai_category: result.ai_duplicate === true ? "duplicate" : result.ai_category,
      ai_priority_score: result.ai_priority_score,
      ai_impact_score: result.ai_impact_score,
      ai_urgency_reason: result.ai_urgency_reason,
      ai_tags: result.ai_tags || [],
      ai_similar_item_ids: result.ai_similar_item_ids || [],
      is_urgent: isUrgent,
      is_transaction_risk: isTransactionRisk,
      is_roadmap_candidate: isRoadmapCandidate,
      is_integration_candidate: isIntegrationCandidate,
      status: isUrgent ? "triaged" : "new",
    };

    await base44.asServiceRole.entities.FeedbackItem.update(feedback_item_id, updates);

    // Log the triage action to AuditLog
    await base44.asServiceRole.entities.AuditLog.create({
      action: "feedback_triaged",
      entity_type: "transaction",
      entity_id: feedback_item_id,
      actor_email: "superagent",
      description: `AI triage: priority=${result.ai_priority_score}, category=${result.ai_category}, urgent=${isUrgent}`,
      after: updates,
    });

    return Response.json({ success: true, updates });
  } catch (error) {
    console.error("triageFeedback error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});