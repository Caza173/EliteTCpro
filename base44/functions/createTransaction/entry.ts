import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Default task templates by transaction type ────────────────────────────────
const DEFAULT_TASKS = {
  buyer_under_contract: {
    1: [ // Under Contract
      { title: "Upload Executed Purchase & Sales Agreement", required: true },
      { title: "Verify Effective Date", required: true },
      { title: "Verify Closing Date", required: true },
      { title: "Verify Earnest Money Amount", required: true },
      { title: "Verify Escrow Holder", required: true },
      { title: "Verify Buyer Agency Agreement", required: true },
      { title: "Verify Brokerage Disclosure", required: true },
      { title: "Verify Pre-Approval or Proof of Funds", required: true },
      { title: "Create Transaction Record", required: true },
      { title: "Add Buyer Contact Information", required: true },
      { title: "Add Seller Contact Information", required: true },
      { title: "Add Lender", required: false },
      { title: "Add Title Company", required: true },
      { title: "Send Introduction Email", required: true },
      { title: "Send Wire Fraud Notice", required: true },
      { title: "Deliver Earnest Money", required: true },
      { title: "Verify Earnest Money Receipt", required: true },
      { title: "Upload Property Disclosure", required: false },
      { title: "Upload Lead Paint Disclosure", required: false },
      { title: "Upload HOA Documents", required: false },
    ],
    2: [ // Due Diligence / Inspections
      { title: "Schedule Home Inspection", required: true },
      { title: "Complete Home Inspection", required: true },
      { title: "Upload Inspection Report", required: true },
      { title: "Schedule Septic Inspection", required: false },
      { title: "Schedule Water Test", required: false },
      { title: "Schedule Radon Test", required: false },
      { title: "Review Inspection Results", required: true },
      { title: "Prepare Inspection Addendum", required: false },
      { title: "Negotiate Repairs", required: false },
      { title: "Upload Signed Addendum", required: false },
      { title: "Remove Inspection Contingency", required: true },
      { title: "Review Title Commitment", required: true },
      { title: "Review Easements", required: false },
      { title: "Review Survey", required: false },
      { title: "Review HOA Documents", required: false },
      { title: "Review Restrictive Covenants", required: false },
    ],
    3: [ // Financing / Pending
      { title: "Loan Application Submitted", required: true },
      { title: "Loan Disclosures Signed", required: true },
      { title: "Processing Started", required: false },
      { title: "Appraisal Ordered", required: true },
      { title: "Appraisal Completed", required: true },
      { title: "Appraisal Received", required: true },
      { title: "Appraisal Contingency Removed", required: false },
      { title: "Homeowners Insurance Obtained", required: false },
      { title: "Title Search Complete", required: true },
      { title: "Conditional Approval Received", required: true },
      { title: "Conditions Submitted", required: false },
      { title: "Clear To Close Received", required: true },
      { title: "Confirm Buyer Funds", required: true },
      { title: "Confirm Wire Instructions", required: true },
      { title: "Confirm Closing Date", required: true },
    ],
    4: [ // Closing
      { title: "Schedule Final Walkthrough", required: true },
      { title: "Complete Walkthrough", required: true },
      { title: "Review Closing Disclosure", required: true },
      { title: "Confirm Cash To Close", required: true },
      { title: "Confirm Seller Proceeds", required: false },
      { title: "Confirm Attorney Appointment", required: false },
      { title: "Confirm Closing Package", required: true },
      { title: "Closing Complete", required: true },
      { title: "Funds Disbursed", required: true },
      { title: "Deed Recorded", required: false },
      { title: "Keys Delivered", required: true },
    ],
    5: [ // Post-Close
      { title: "Upload Closing Disclosure", required: true },
      { title: "Upload ALTA", required: false },
      { title: "Upload Recorded Deed", required: false },
      { title: "Upload Commission Statement", required: true },
      { title: "Submit Compliance File", required: true },
      { title: "Archive Transaction", required: false },
      { title: "Send Congratulations Email", required: true },
      { title: "Send Client Gift", required: false },
      { title: "Request Review", required: false },
      { title: "Request Testimonial", required: false },
      { title: "Add To Post-Close Campaign", required: false },
      { title: "Schedule 30-Day Follow-Up", required: true },
      { title: "Schedule 6-Month Follow-Up", required: false },
      { title: "Schedule Annual Follow-Up", required: false },
    ],
  },
  listing: {
    1: [ // Listing Intake / Setup
      { title: "Listing Agreement Signed", required: true },
      { title: "Seller Disclosures Collected", required: true },
      { title: "Property Data Collected", required: true },
      { title: "CMA Completed", required: false },
      { title: "Photos Scheduled", required: false },
      { title: "Sign Installed", required: false },
      { title: "Showing Instructions Set", required: false },
    ],
    2: [ // Active Listing
      { title: "MLS Input Completed", required: true },
      { title: "Photos Uploaded to MLS", required: true },
      { title: "Map/Location Verified", required: true },
      { title: "Listing Live / Syndicated", required: true },
      { title: "Showings Active", required: false },
      { title: "Weekly Seller Updates Sent", required: false },
    ],
    3: [ // Under Contract
      { title: "Upload Executed Purchase & Sales Agreement", required: true },
      { title: "Verify Effective Date", required: true },
      { title: "Verify Closing Date", required: true },
      { title: "Verify Earnest Money Amount", required: true },
      { title: "Verify Escrow Holder", required: true },
      { title: "Create Transaction Record", required: true },
      { title: "Add Buyer Contact Information", required: true },
      { title: "Add Seller Contact Information", required: true },
      { title: "Add Buyer Agent Contact", required: true },
      { title: "Add Lender", required: false },
      { title: "Add Title Company", required: true },
      { title: "Send Introduction Email", required: true },
      { title: "Send Wire Fraud Notice", required: true },
      { title: "Verify Earnest Money Receipt", required: true },
    ],
    4: [ // Due Diligence
      { title: "Inspection Scheduled", required: true },
      { title: "Inspection Completed", required: true },
      { title: "Upload Inspection Report", required: true },
      { title: "Review Inspection Results", required: true },
      { title: "Negotiate Repairs", required: false },
      { title: "Upload Signed Addendum", required: false },
      { title: "Remove Inspection Contingency", required: true },
      { title: "Review Title Commitment", required: true },
    ],
    5: [ // Financing / Pending
      { title: "Appraisal Ordered", required: true },
      { title: "Appraisal Completed", required: true },
      { title: "Appraisal Received", required: true },
      { title: "Appraisal Negotiation (If Applicable)", required: false },
      { title: "Conditional Approval Received", required: true },
      { title: "Clear To Close Received", required: true },
      { title: "Confirm Wire Instructions", required: true },
      { title: "Send Commission Statement", required: true },
    ],
    6: [ // Closing
      { title: "Schedule Final Walkthrough", required: true },
      { title: "Complete Walkthrough", required: true },
      { title: "Review Closing Disclosure", required: true },
      { title: "Confirm Seller Proceeds", required: true },
      { title: "Confirm Attorney Appointment", required: false },
      { title: "Closing Complete", required: true },
      { title: "Funds Disbursed", required: true },
      { title: "Keys Delivered", required: true },
    ],
    7: [ // Post-Close
      { title: "Upload Closing Disclosure", required: true },
      { title: "Upload ALTA", required: false },
      { title: "Upload Recorded Deed", required: false },
      { title: "Upload Commission Statement", required: true },
      { title: "Submit Compliance File", required: true },
      { title: "Update MLS Status to Closed", required: true },
      { title: "Archive Transaction", required: false },
      { title: "Send Congratulations Email", required: true },
      { title: "Request Review", required: false },
      { title: "Request Testimonial", required: false },
      { title: "Schedule 30-Day Follow-Up", required: true },
      { title: "Schedule 6-Month Follow-Up", required: false },
      { title: "Schedule Annual Follow-Up", required: false },
    ],
  },
};

// Map transaction_type to template key
function resolveTemplateType(txType) {
  if (!txType) return "buyer_under_contract";
  if (txType === "buyer" || txType === "buyer_under_contract") return "buyer_under_contract";
  if (txType === "seller" || txType === "listing") return "listing";
  return "buyer_under_contract"; // default for dual, other
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const brokerage_id = user.data?.brokerage_id || body.brokerage_id || null;
    const agent = body.agent || user.full_name || user.email || '';

    // Strip any client-supplied ownership fields — we stamp them authoritatively
    const { created_by: _c, team_id: _t, assigned_tc_id: _a, owner_user_id: _o, ...safeBody } = body;

    console.log(`[createTransaction] user.id=${user.id} user.email=${user.email}`);

    // MUST use user-scoped client so platform stamps created_by = user.id (UUID)
    const tx = await base44.entities.Transaction.create({
      ...safeBody,
      agent,
      brokerage_id: brokerage_id || undefined,
      agent_email: safeBody.agent_email || user.email || undefined,
      // Ownership fields — stamped authoritatively by the server
      owner_user_id: user.id,
      created_by_email: user.email,
    });

    console.log(`[createTransaction] created tx.id=${tx.id} owner_user_id=${tx.owner_user_id} created_by=${tx.created_by}`);

    // ── Auto-seed tasks from default template ────────────────────────────────
    try {
      const templateType = resolveTemplateType(safeBody.transaction_type || safeBody.transactionType);
      const phaseTaskMap = DEFAULT_TASKS[templateType] || DEFAULT_TASKS.buyer_under_contract;

      const taskRecords = [];
      for (const [phaseStr, phaseTasks] of Object.entries(phaseTaskMap)) {
        const phaseNum = parseInt(phaseStr, 10);
        phaseTasks.forEach((task, idx) => {
          taskRecords.push({
            transaction_id: tx.id,
            brokerage_id: brokerage_id || undefined,
            phase: phaseNum,
            title: task.title,
            order_index: idx,
            is_completed: false,
            is_required: task.required,
            is_custom: false,
            created_by: user.id,
          });
        });
      }

      // Batch create all tasks
      await Promise.all(
        taskRecords.map(record => base44.asServiceRole.entities.TransactionTask.create(record))
      );

      console.log(`[createTransaction] seeded ${taskRecords.length} tasks for tx.id=${tx.id} type=${templateType}`);
    } catch (taskErr) {
      // Don't fail the transaction creation if task seeding fails
      console.error(`[createTransaction] task seeding failed for tx.id=${tx.id}:`, taskErr.message);
    }

    return Response.json(tx);
  } catch (error) {
    console.error('[createTransaction] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});