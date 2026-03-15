import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Automation handler: triggered when a Transaction is created
// Calls skySlopeSync to push the new transaction to SkySlope
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (event?.type !== "create") return Response.json({ skipped: true });

    const transactionId = event?.entity_id || data?.id;
    if (!transactionId) return Response.json({ skipped: true, reason: "no transaction_id" });

    // Small delay to let the record fully commit
    await new Promise(r => setTimeout(r, 2000));

    const brokerageId = data?.brokerage_id || "";

    const result = await base44.asServiceRole.functions.invoke("skySlopeSync", {
      action: "syncTransaction",
      transaction_id: transactionId,
      brokerage_id: brokerageId,
    });

    console.log("SkySlope transaction sync result:", JSON.stringify(result));
    return Response.json({ success: true, result });
  } catch (error) {
    console.error("skySlopeSyncOnTransactionCreate error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});