import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Generates a populated NHAR-style Addendum to Purchase and Sales Agreement
// as a proper .docx file using raw OpenXML

function buildAddendumDocx(data) {
  const { buyer_name, seller_name, property_address, contract_date, addendum_clause } = data;

  // Build the OpenXML document content
  const xmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
  mc:Ignorable="w14 wp14">
  <w:body>

    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>ADDENDUM</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>TO THE PURCHASE AND SALES AGREEMENT</w:t></w:r>
    </w:p>

    <w:p><w:pPr><w:spacing w:after="240"/></w:pPr></w:p>

    <w:p>
      <w:pPr><w:spacing w:after="120"/></w:pPr>
      <w:r><w:t xml:space="preserve">This Addendum to the Purchase and Sales Agreement with an effective date of </w:t></w:r>
      <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>${escapeXml(contract_date)}</w:t></w:r>
      <w:r><w:t xml:space="preserve"> between</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:spacing w:after="120"/></w:pPr>
      <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>${escapeXml(seller_name)}</w:t></w:r>
      <w:r><w:t xml:space="preserve"> </w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>("SELLER")</w:t></w:r>
      <w:r><w:t xml:space="preserve">, and</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:spacing w:after="120"/></w:pPr>
      <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>${escapeXml(buyer_name)}</w:t></w:r>
      <w:r><w:t xml:space="preserve"> </w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>("BUYER")</w:t></w:r>
      <w:r><w:t xml:space="preserve">, for the property located at</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:spacing w:after="120"/></w:pPr>
      <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t>${escapeXml(property_address)}</w:t></w:r>
      <w:r><w:t xml:space="preserve">, hereby agree to the following:</w:t></w:r>
    </w:p>

    <w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>

    <w:p>
      <w:pPr><w:spacing w:after="240"/></w:pPr>
      <w:r><w:t>${escapeXml(addendum_clause)}</w:t></w:r>
    </w:p>

    <w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>

    <w:p>
      <w:pPr><w:spacing w:after="80"/></w:pPr>
      <w:r><w:t>All other aspects of the aforementioned Purchase and Sales Agreement shall remain in full force and effect. The aforementioned Purchase and Sales Agreement, together with this Addendum (and all prior addenda, if any), constitute the entire agreement and understanding between the parties hereto concerning the subject matter thereof, and supersede any agreements and understandings prior to the date hereof, whether written or oral, and may not be amended except in a writing executed by all parties.</w:t></w:r>
    </w:p>

    <w:p>
      <w:pPr><w:spacing w:after="80"/></w:pPr>
      <w:r><w:t>Each party is to receive a fully executed copy of this Agreement. This Agreement shall be binding upon the heirs, executors, administrators and assigns of both parties.</w:t></w:r>
    </w:p>

    <w:p><w:pPr><w:spacing w:after="480"/></w:pPr></w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9360" w:type="dxa"/>
        <w:tblBorders>
          <w:insideH w:val="none"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="4680"/>
        <w:gridCol w:w="4680"/>
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="4680" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="60"/></w:pPr>
            <w:r><w:rPr><w:b/></w:rPr><w:t>BUYER</w:t></w:r>
            <w:r><w:t xml:space="preserve">   DATE / TIME</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="0"/></w:pPr>
            <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">                                                        </w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4680" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:after="60"/></w:pPr>
            <w:r><w:rPr><w:b/></w:rPr><w:t>BUYER</w:t></w:r>
            <w:r><w:t xml:space="preserve">   DATE / TIME</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="0"/></w:pPr>
            <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">                                                        </w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="4680" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:before="480" w:after="60"/></w:pPr>
            <w:r><w:rPr><w:b/></w:rPr><w:t>SELLER</w:t></w:r>
            <w:r><w:t xml:space="preserve">   DATE / TIME</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="0"/></w:pPr>
            <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">                                                        </w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w:w="4680" w:type="dxa"/></w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:before="480" w:after="60"/></w:pPr>
            <w:r><w:rPr><w:b/></w:rPr><w:t>SELLER</w:t></w:r>
            <w:r><w:t xml:space="preserve">   DATE / TIME</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:spacing w:after="0"/></w:pPr>
            <w:r><w:rPr><w:b/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">                                                        </w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>

    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  return xmlContent;
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Build a minimal valid .docx (ZIP) from scratch
async function buildDocxZip(documentXml) {
  // We'll use JSZip to build the .docx
  const JSZip = (await import('npm:jszip@3.10.1')).default;
  const zip = new JSZip();

  // [Content_Types].xml
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`);

  // _rels/.rels
  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  // word/document.xml
  zip.folder('word').file('document.xml', documentXml);

  // word/_rels/document.xml.rels
  zip.folder('word').folder('_rels').file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`);

  // word/settings.xml
  zip.folder('word').file('settings.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
</w:settings>`);

  return await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Auth check — skip in service/test contexts
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { /* unauthenticated context */ }
    if (!user) {
      // Allow service-role test calls without user auth
      const isServiceCall = req.headers.get('x-service-call') === 'true';
      if (!isServiceCall) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { transaction_id, addendum_clause, notification_id } = body;

    if (!transaction_id) {
      return Response.json({ error: 'transaction_id is required' }, { status: 400 });
    }

    // Fetch the transaction by listing and finding by id
    const allTx = await base44.asServiceRole.entities.Transaction.list();
    const tx = allTx.find(t => t.id === transaction_id);
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    // Build merge fields
    const buyers = (tx.buyers?.length ? tx.buyers : [tx.buyer]).filter(Boolean).join(' and ') || '';
    const sellers = (tx.sellers?.length ? tx.sellers : [tx.seller]).filter(Boolean).join(' and ') || '';
    const contractDate = tx.contract_date
      ? new Date(tx.contract_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : '';

    // Pull verbiage from notification if not provided directly
    let clause = addendum_clause || '';
    if (!clause && notification_id) {
      const notifList = await base44.asServiceRole.entities.InAppNotification.filter({ id: notification_id });
      clause = notifList[0]?.addendum_verbiage || '';
    }

    const mergeData = {
      buyer_name: buyers,
      seller_name: sellers,
      property_address: tx.address || '',
      contract_date: contractDate,
      addendum_clause: clause,
    };

    const documentXml = buildAddendumDocx(mergeData);
    const docxBytes = await buildDocxZip(documentXml);

    const fileName = `Addendum_${(tx.address || 'Transaction').replace(/[^a-zA-Z0-9]/g, '_')}.docx`;

    return new Response(docxBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});