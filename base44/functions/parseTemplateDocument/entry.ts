import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Default land workflow template
const LAND_DEFAULT_TEMPLATE = {
  transaction_type: "land",
  phases: [
    { phase_number: 1, phase_name: "Pre-Contract", phase_description: "Initial property evaluation and offer preparation" },
    { phase_number: 2, phase_name: "Under Contract", phase_description: "Executed purchase agreement and deposit" },
    { phase_number: 3, phase_name: "Due Diligence", phase_description: "Surveys, soil testing, zoning, and environmental review" },
    { phase_number: 4, phase_name: "Closing", phase_description: "Final title, deed transfer, and closing" },
  ],
  tasks: [
    // Phase 1 — Pre-Contract
    { id: "land_1_1", phase_number: 1, task_name: "Verify lot size and acreage", required: true, default_assignee_role: "tc", compliance_rule: "missing_lot_size" },
    { id: "land_1_2", phase_number: 1, task_name: "Confirm zoning classification", required: true, default_assignee_role: "agent", compliance_rule: "unknown_zoning" },
    { id: "land_1_3", phase_number: 1, task_name: "Check road frontage / access", required: true, default_assignee_role: "agent", compliance_rule: "missing_access" },
    { id: "land_1_4", phase_number: 1, task_name: "Identify utilities availability (water, sewer, electric)", required: true, default_assignee_role: "agent", compliance_rule: "missing_utilities" },
    // Phase 2 — Under Contract
    { id: "land_2_1", phase_number: 2, task_name: "Collect earnest money deposit", required: true, default_assignee_role: "tc", due_offset_days: 3, due_anchor: "contract_date" },
    { id: "land_2_2", phase_number: 2, task_name: "Order title search", required: true, default_assignee_role: "tc", due_offset_days: 5, due_anchor: "contract_date" },
    { id: "land_2_3", phase_number: 2, task_name: "Confirm survey on file or order new survey", required: true, default_assignee_role: "tc", compliance_rule: "missing_survey" },
    // Phase 3 — Due Diligence
    { id: "land_3_1", phase_number: 3, task_name: "Soil testing / perc test (if applicable)", required: false, default_assignee_role: "agent" },
    { id: "land_3_2", phase_number: 3, task_name: "Environmental review / wetlands check", required: true, default_assignee_role: "agent", compliance_rule: "missing_environmental" },
    { id: "land_3_3", phase_number: 3, task_name: "Survey review and boundary confirmation", required: true, default_assignee_role: "tc" },
    { id: "land_3_4", phase_number: 3, task_name: "Zoning board / planning board approval (if needed)", required: false, default_assignee_role: "agent" },
    { id: "land_3_5", phase_number: 3, task_name: "Utilities connection feasibility confirmed", required: true, default_assignee_role: "agent" },
    { id: "land_3_6", phase_number: 3, task_name: "Access road / easement review", required: true, default_assignee_role: "tc" },
    { id: "land_3_7", phase_number: 3, task_name: "Lender site visit / appraisal (if financed)", required: false, default_assignee_role: "tc" },
    // Phase 4 — Closing
    { id: "land_4_1", phase_number: 4, task_name: "Final title commitment received", required: true, default_assignee_role: "tc" },
    { id: "land_4_2", phase_number: 4, task_name: "Deed prepared and reviewed", required: true, default_assignee_role: "tc" },
    { id: "land_4_3", phase_number: 4, task_name: "Closing disclosure reviewed with buyer", required: true, default_assignee_role: "tc" },
    { id: "land_4_4", phase_number: 4, task_name: "Final walkthrough / site visit", required: true, default_assignee_role: "agent" },
    { id: "land_4_5", phase_number: 4, task_name: "Closing completed and deed recorded", required: true, default_assignee_role: "tc" },
  ],
  deadlines: [
    { id: "dl_1", deadline_type: "earnest_money_deadline", due_offset_days: 3, due_anchor: "contract_date" },
    { id: "dl_2", deadline_type: "due_diligence_deadline", due_offset_days: 21, due_anchor: "contract_date" },
    { id: "dl_3", deadline_type: "closing_date", due_offset_days: 60, due_anchor: "contract_date" },
  ],
  doc_checklist: [
    { id: "dc_1", doc_type: "Purchase and Sales Agreement", required: true, required_by_phase: 2 },
    { id: "dc_2", doc_type: "Survey", required: true, required_by_phase: 3 },
    { id: "dc_3", doc_type: "Title Search", required: true, required_by_phase: 4 },
    { id: "dc_4", doc_type: "Environmental Report", required: false, required_by_phase: 3 },
    { id: "dc_5", doc_type: "Zoning Verification Letter", required: true, required_by_phase: 3 },
    { id: "dc_6", doc_type: "Closing Disclosure", required: true, required_by_phase: 4 },
  ],
  compliance_rules: [
    { rule_id: "missing_access", check: "road_frontage", severity: "blocker", message: "Road frontage / access not verified for land parcel" },
    { rule_id: "missing_utilities", check: "utilities", severity: "warning", message: "Utilities availability (water, sewer) not confirmed" },
    { rule_id: "unknown_zoning", check: "zoning", severity: "blocker", message: "Zoning classification not confirmed" },
    { rule_id: "missing_survey", check: "survey", severity: "warning", message: "Survey not on file — required for land transaction" },
    { rule_id: "missing_environmental", check: "environmental", severity: "warning", message: "Environmental review / wetlands check not completed" },
    { rule_id: "missing_lot_size", check: "lot_size", severity: "info", message: "Lot size / acreage not recorded" },
  ],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, file_url, file_name, brokerage_id, template_id } = await req.json();

    // ── ACTION: get_land_default ─────────────────────────────────────────────
    if (action === "get_land_default") {
      return Response.json({ success: true, template: LAND_DEFAULT_TEMPLATE });
    }



    // ── ACTION: parse ────────────────────────────────────────────────────────
    if (!file_url) {
      return Response.json({ error: 'file_url required for parse action' }, { status: 400 });
    }

    // Step 1 — Extract text from document via AI (supports PDF, DOCX, TXT)
    const extractPrompt = `You are a real estate transaction workflow parser.

Extract ALL text content from this document. Preserve headings, lists, numbering, and structure exactly as-is.
Return the full extracted text as a single string in the "text" field.
Also detect:
- document_type: what kind of document this is (checklist, workflow, template, procedure, other)
- property_type: buyer | seller | land | commercial | multifamily | general (based on content)
- detected_name: a short name for this template based on its content`;

    const extractResult = await base44.integrations.Core.InvokeLLM({
      prompt: extractPrompt,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          text: { type: "string" },
          document_type: { type: "string" },
          property_type: { type: "string" },
          detected_name: { type: "string" },
        }
      }
    });

    const extractedText = extractResult.text || "";
    const detectedPropertyType = extractResult.property_type || "buyer";
    const detectedName = extractResult.detected_name || file_name?.replace(/\.[^.]+$/, "") || "Uploaded Template";

    if (!extractedText || extractedText.length < 20) {
      return Response.json({ error: "Could not extract text from document. Please ensure it is not a scanned image without OCR." }, { status: 422 });
    }

    // Step 2 — AI structuring: convert text to workflow JSON
    const isLand = detectedPropertyType === "land" || extractedText.toLowerCase().includes("zoning") || extractedText.toLowerCase().includes("lot size") || extractedText.toLowerCase().includes("perc test");

    const structurePrompt = `You are a real estate transaction workflow builder.

Convert the following document text into a structured transaction workflow template.

Document text:
---
${extractedText.slice(0, 6000)}
---

${isLand ? `This appears to be a LAND transaction. Include land-specific fields:
- Zoning, lot size, road frontage, utilities (water/sewer), survey, environmental/wetlands.
- Compliance rules for: missing_access, unknown_zoning, missing_survey, missing_utilities, missing_environmental
` : ""}

Rules:
- Group tasks into logical phases (Pre-Contract, Under Contract, Due Diligence/Inspection, Financing, Closing, Post-Closing)
- Each task must have a phase_number (1-based), task_name, required (true/false)
- If a task has a deadline, estimate due_offset_days from contract_date or closing_date
- Mark clearly required vs optional tasks
- Extract any document checklist items mentioned

Return ONLY valid JSON.`;

    const structureResult = await base44.integrations.Core.InvokeLLM({
      prompt: structurePrompt,
      response_json_schema: {
        type: "object",
        properties: {
          template_name: { type: "string" },
          transaction_type: { type: "string" },
          phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase_number: { type: "number" },
                phase_name: { type: "string" },
                phase_description: { type: "string" }
              }
            }
          },
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                phase_number: { type: "number" },
                task_name: { type: "string" },
                required: { type: "boolean" },
                default_assignee_role: { type: "string" },
                due_offset_days: { type: "number" },
                due_anchor: { type: "string" },
                alert_trigger: { type: "string" }
              }
            }
          },
          deadlines: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                deadline_type: { type: "string" },
                due_offset_days: { type: "number" },
                due_anchor: { type: "string" }
              }
            }
          },
          doc_checklist: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                doc_type: { type: "string" },
                required: { type: "boolean" },
                required_by_phase: { type: "number" }
              }
            }
          },
          compliance_rules: {
            type: "array",
            items: {
              type: "object",
              properties: {
                rule_id: { type: "string" },
                check: { type: "string" },
                severity: { type: "string" },
                message: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Ensure IDs are set on all items
    const ensureIds = (arr, prefix) =>
      (arr || []).map((item, i) => ({ ...item, id: item.id || `${prefix}_${i + 1}` }));

    const parsed = {
      template_name: structureResult.template_name || detectedName,
      transaction_type: structureResult.transaction_type || detectedPropertyType,
      phases: ensureIds(structureResult.phases, "ph"),
      tasks: ensureIds(structureResult.tasks, "t"),
      deadlines: ensureIds(structureResult.deadlines, "dl"),
      doc_checklist: ensureIds(structureResult.doc_checklist, "dc"),
      compliance_rules: ensureIds(structureResult.compliance_rules, "cr"),
      extracted_text_preview: extractedText.slice(0, 500),
    };

    // Merge land compliance rules if land type
    if (isLand && (!parsed.compliance_rules || parsed.compliance_rules.length === 0)) {
      parsed.compliance_rules = LAND_DEFAULT_TEMPLATE.compliance_rules;
    }

    return Response.json({ success: true, parsed, detected_property_type: detectedPropertyType });

  } catch (error) {
    console.error("[parseTemplateDocument]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});