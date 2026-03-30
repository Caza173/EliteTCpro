import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Parse Buyer Agency Agreement PDF to extract Section 3 dates
 * 
 * Payload: { file_url, transaction_id, brokerage_id }
 * Returns: { agreement_start_date, agreement_expiration_date, parsed_at }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file_url, transaction_id, brokerage_id } = body;

    if (!file_url) {
      return Response.json({ error: 'file_url required' }, { status: 400 });
    }

    // For MVP: extract dates from PDF using regex pattern on extracted text
    // In production, use a proper PDF parsing library
    const response = await fetch(file_url);
    if (!response.ok) {
      return Response.json({ error: 'Could not fetch PDF' }, { status: 400 });
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // Use pdfparse-like parsing (simplified text extraction)
    // Section 3 format: "THIS AGREEMENT SHALL BE IN EFFECT FROM [DATE] through [DATE]"
    const textContent = await extractPdfText(arrayBuffer);
    
    const dates = extractSection3Dates(textContent);
    
    if (!dates.agreement_expiration_date) {
      // Missing expiration date - flag as compliance issue
      if (transaction_id && brokerage_id) {
        await base44.entities.ComplianceIssue.create({
          transaction_id,
          brokerage_id,
          issue_type: "signature",
          severity: "warning",
          message: "Missing expiration date in Buyer Agency Agreement (Section 3)",
          status: "open",
          source: "ai_scan",
        });
      }
      return Response.json({
        agreement_start_date: dates.agreement_start_date || null,
        agreement_expiration_date: null,
        parsed_at: new Date().toISOString(),
        warning: "No expiration date found",
      });
    }

    return Response.json({
      agreement_start_date: dates.agreement_start_date,
      agreement_expiration_date: dates.agreement_expiration_date,
      parsed_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Simplified PDF text extraction
 * In production, use a proper library like pdfjs or pdfparse
 */
async function extractPdfText(arrayBuffer) {
  // This is a placeholder - real implementation would parse PDF properly
  // For now, return mock text for testing
  // In production, use npm:pdf-parse or similar
  
  // Mock: return text from buffer or call external service
  const text = new TextDecoder().decode(new Uint8Array(arrayBuffer).slice(0, 5000));
  return text;
}

/**
 * Extract "from" and "through" dates from Section 3
 * Pattern: "THIS AGREEMENT SHALL BE IN EFFECT FROM [DATE] through [DATE]"
 */
function extractSection3Dates(text) {
  const result = {
    agreement_start_date: null,
    agreement_expiration_date: null,
  };

  // Look for Section 3 pattern with flexible date formats
  const section3Regex = /THIS\s+AGREEMENT\s+SHALL\s+BE\s+IN\s+EFFECT\s+FROM\s+([^\t]+?)\s+through\s+([^\t]+?)[\.\s]/i;
  const match = text.match(section3Regex);

  if (match) {
    const startStr = match[1]?.trim();
    const endStr = match[2]?.trim();

    // Parse dates (handle M/D/YYYY, MM/DD/YYYY, Month D, YYYY formats)
    result.agreement_start_date = parseDate(startStr);
    result.agreement_expiration_date = parseDate(endStr);
  }

  return result;
}

/**
 * Parse flexible date formats
 * Handles: M/D/YYYY, MM/DD/YYYY, Month D, YYYY, etc.
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  const trimmed = dateStr.replace(/[^\d/\-\s\w]/g, '').trim();
  
  // Try MM/DD/YYYY format
  let match = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [_, m, d, y] = match;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return isValidDate(date) ? date.toISOString().split('T')[0] : null;
  }

  // Try Month D, YYYY format
  const months = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  };
  match = trimmed.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (match) {
    const [_, monthStr, d, y] = match;
    const m = months[monthStr.toLowerCase()];
    if (m) {
      const date = new Date(parseInt(y), m - 1, parseInt(d));
      return isValidDate(date) ? date.toISOString().split('T')[0] : null;
    }
  }

  return null;
}

function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
}