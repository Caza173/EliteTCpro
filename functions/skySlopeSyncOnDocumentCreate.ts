import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Automation handler: triggered when a Document is created
// Calls skySlopeSync to push the document to the SkySlope compliance file
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (event?.type !== "create") return Response.json({ skipped: true });

    const documentId = event?.entity_id || data?.id;
    if (!documentId) return Response.json({ skipped: true, reason: "no document_id" });

    // Small delay to let the record fully commit
    await new Promise(r => setTimeout(r, 2000));

    const result = await base44.asServiceRole.functions.invoke("skySlopeSync", {
      action: "syncDocument",
      document_id: documentId,
    });

    console.log("SkySlope document sync result:", JSON.stringify(result));
    return Response.json({ success: true, result });
  } catch (error) {
    console.error("skySlopeSyncOnDocumentCreate error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});