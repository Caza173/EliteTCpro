/**
 * textractDocument
 * Uploads a PDF from a URL to S3, runs AWS Textract AnalyzeDocument (FORMS + TABLES),
 * and returns a structured normalized text bundle for GPT consumption.
 *
 * Server-side only. AWS credentials never leave this function.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
  TextractClient,
  AnalyzeDocumentCommand,
} from 'npm:@aws-sdk/client-textract@3.600.0';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from 'npm:@aws-sdk/client-s3@3.600.0';

// ── AWS clients (initialized inside handler to avoid boot-level errors) ────────
function getClients() {
  const region = Deno.env.get('AWS_REGION') || 'us-east-2';
  const credentials = {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
  };
  return {
    s3: new S3Client({ region, credentials }),
    textract: new TextractClient({ region, credentials }),
    bucket: Deno.env.get('S3_BUCKET') || 'elitetc-documents',
  };
}

// ── Normalize Textract blocks into structured text chunks ─────────────────────

function buildPageMap(blocks) {
  // Map page number → array of LINE blocks sorted top-to-bottom, left-to-right
  const pages = {};
  for (const b of blocks) {
    if (b.BlockType !== 'LINE') continue;
    const pg = b.Page || 1;
    if (!pages[pg]) pages[pg] = [];
    pages[pg].push(b);
  }
  // Sort each page by vertical position then horizontal
  for (const pg of Object.keys(pages)) {
    pages[pg].sort((a, b) => {
      const aTop = a.Geometry?.BoundingBox?.Top || 0;
      const bTop = b.Geometry?.BoundingBox?.Top || 0;
      if (Math.abs(aTop - bTop) > 0.01) return aTop - bTop;
      return (a.Geometry?.BoundingBox?.Left || 0) - (b.Geometry?.BoundingBox?.Left || 0);
    });
  }
  return pages;
}

function buildKeyValuePairs(blocks) {
  // Build id → block map
  const byId = {};
  for (const b of blocks) byId[b.Id] = b;

  const pairs = [];
  for (const b of blocks) {
    if (b.BlockType !== 'KEY_VALUE_SET' || !b.EntityTypes?.includes('KEY')) continue;

    // Get key text
    const keyText = (b.Relationships || [])
      .filter(r => r.Type === 'CHILD')
      .flatMap(r => r.Ids || [])
      .map(id => byId[id]?.Text || '')
      .join(' ')
      .trim();

    // Get value block
    const valueBlockId = (b.Relationships || [])
      .find(r => r.Type === 'VALUE')
      ?.Ids?.[0];

    const valueBlock = valueBlockId ? byId[valueBlockId] : null;
    const valueText = valueBlock
      ? (valueBlock.Relationships || [])
          .filter(r => r.Type === 'CHILD')
          .flatMap(r => r.Ids || [])
          .map(id => byId[id]?.Text || '')
          .join(' ')
          .trim()
      : '';

    const confidence = Math.min(
      b.Confidence || 100,
      valueBlock?.Confidence || 100
    );

    if (keyText) {
      pairs.push({
        key: keyText,
        value: valueText,
        confidence: Math.round(confidence),
        page: b.Page || 1,
      });
    }
  }
  return pairs;
}

function buildTables(blocks) {
  const byId = {};
  for (const b of blocks) byId[b.Id] = b;

  const tables = [];
  for (const b of blocks) {
    if (b.BlockType !== 'TABLE') continue;

    const cells = (b.Relationships || [])
      .filter(r => r.Type === 'CHILD')
      .flatMap(r => r.Ids || [])
      .map(id => byId[id])
      .filter(c => c?.BlockType === 'CELL');

    // Build grid
    const grid = {};
    for (const cell of cells) {
      const row = cell.RowIndex || 1;
      const col = cell.ColumnIndex || 1;
      const text = (cell.Relationships || [])
        .filter(r => r.Type === 'CHILD')
        .flatMap(r => r.Ids || [])
        .map(id => byId[id]?.Text || '')
        .join(' ')
        .trim();
      if (!grid[row]) grid[row] = {};
      grid[row][col] = text;
    }

    // Convert to row arrays
    const rows = Object.keys(grid)
      .sort((a, b) => Number(a) - Number(b))
      .map(rowIdx => {
        const cols = grid[rowIdx];
        const maxCol = Math.max(...Object.keys(cols).map(Number));
        return Array.from({ length: maxCol }, (_, i) => cols[i + 1] || '');
      });

    tables.push({ page: b.Page || 1, rows });
  }
  return tables;
}

function buildCheckboxes(blocks) {
  const checkboxes = [];
  for (const b of blocks) {
    if (b.BlockType !== 'SELECTION_ELEMENT') continue;
    checkboxes.push({
      status: b.SelectionStatus, // SELECTED or NOT_SELECTED
      confidence: Math.round(b.Confidence || 0),
      page: b.Page || 1,
      top: b.Geometry?.BoundingBox?.Top || 0,
      left: b.Geometry?.BoundingBox?.Left || 0,
    });
  }
  return checkboxes;
}

/**
 * Build a flat text representation of each page with inline checkbox markers.
 * This is what gets passed to GPT as the primary text context.
 */
function buildPageText(pageMap, blocks) {
  const byId = {};
  for (const b of blocks) byId[b.Id] = b;

  const pageTexts = {};
  for (const [pg, lines] of Object.entries(pageMap)) {
    pageTexts[pg] = lines
      .map(line => {
        // Inline any SELECTION_ELEMENT children as [✓] or [ ]
        let text = line.Text || '';
        const childIds = (line.Relationships || [])
          .filter(r => r.Type === 'CHILD')
          .flatMap(r => r.Ids || []);
        for (const childId of childIds) {
          const child = byId[childId];
          if (child?.BlockType === 'SELECTION_ELEMENT') {
            const mark = child.SelectionStatus === 'SELECTED' ? '[✓]' : '[ ]';
            text = `${mark} ${text}`;
          }
        }
        return text;
      })
      .join('\n');
  }
  return pageTexts;
}

/**
 * Format key-value pairs as structured text for GPT context.
 */
function formatKVPairs(pairs) {
  if (!pairs.length) return '';
  return pairs
    .map(p => `  ${p.key}: "${p.value}" (pg ${p.page}, conf ${p.confidence}%)`)
    .join('\n');
}

/**
 * Format tables as structured text for GPT context.
 */
function formatTables(tables) {
  if (!tables.length) return '';
  return tables
    .map((t, i) => {
      const header = `TABLE ${i + 1} (Page ${t.page}):`;
      const rows = t.rows.map(r => '  | ' + r.join(' | ') + ' |').join('\n');
      return `${header}\n${rows}`;
    })
    .join('\n\n');
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

    const { s3, textract, bucket } = getClients();

    // ── Step 1: Fetch PDF from CDN ──────────────────────────────────────────────
    console.log('[textractDocument] Fetching PDF from:', file_url);
    const fetchRes = await fetch(file_url);
    if (!fetchRes.ok) {
      return Response.json({ error: `Failed to fetch document: ${fetchRes.status}` }, { status: 400 });
    }
    const pdfBytes = new Uint8Array(await fetchRes.arrayBuffer());
    console.log(`[textractDocument] PDF size: ${pdfBytes.length} bytes`);

    // ── Step 2: Upload to S3 (temp key, will delete after Textract) ────────────
    const s3Key = `textract-tmp/${user.id}/${Date.now()}.pdf`;
    console.log('[textractDocument] Uploading to S3:', s3Key);

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: pdfBytes,
      ContentType: 'application/pdf',
    }));

    // ── Step 3: Call Textract AnalyzeDocument ───────────────────────────────────
    console.log('[textractDocument] Running Textract AnalyzeDocument...');
    let textractResult;
    try {
      textractResult = await textract.send(new AnalyzeDocumentCommand({
        Document: {
          S3Object: { Bucket: bucket, Name: s3Key },
        },
        FeatureTypes: ['FORMS', 'TABLES'],
      }));
    } finally {
      // ── Step 4: Delete temp S3 object regardless of Textract outcome ──────────
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: s3Key }));
        console.log('[textractDocument] Deleted temp S3 object');
      } catch (delErr) {
        console.warn('[textractDocument] Failed to delete S3 temp:', delErr.message);
      }
    }

    const blocks = textractResult.Blocks || [];
    console.log(`[textractDocument] Textract returned ${blocks.length} blocks`);

    // ── Step 5: Normalize blocks ───────────────────────────────────────────────
    const pageMap    = buildPageMap(blocks);
    const kvPairs    = buildKeyValuePairs(blocks);
    const tables     = buildTables(blocks);
    const checkboxes = buildCheckboxes(blocks);
    const pageTexts  = buildPageText(pageMap, blocks);

    const pageCount = Math.max(...blocks.map(b => b.Page || 1));

    // Build the full text corpus (page by page)
    const fullText = Object.keys(pageTexts)
      .sort((a, b) => Number(a) - Number(b))
      .map(pg => `--- PAGE ${pg} ---\n${pageTexts[pg]}`)
      .join('\n\n');

    // Build structured context string for GPT
    const structuredContext = [
      `=== TEXTRACT FULL TEXT (${pageCount} pages) ===\n${fullText}`,
      kvPairs.length
        ? `\n=== KEY-VALUE PAIRS EXTRACTED BY TEXTRACT (${kvPairs.length} total) ===\n${formatKVPairs(kvPairs)}`
        : '',
      tables.length
        ? `\n=== TABLES EXTRACTED BY TEXTRACT (${tables.length} total) ===\n${formatTables(tables)}`
        : '',
      checkboxes.length
        ? `\n=== CHECKBOX STATES (${checkboxes.filter(c => c.status === 'SELECTED').length} checked / ${checkboxes.length} total) ===\n` +
          checkboxes.map(c => `  pg${c.page} top=${c.top.toFixed(3)} left=${c.left.toFixed(3)}: ${c.status} (${c.confidence}%)`).join('\n')
        : '',
    ].filter(Boolean).join('\n');

    return Response.json({
      success: true,
      page_count: pageCount,
      block_count: blocks.length,
      kv_pair_count: kvPairs.length,
      table_count: tables.length,
      checkbox_count: checkboxes.length,
      // Structured data
      page_texts: pageTexts,
      kv_pairs: kvPairs,
      tables,
      checkboxes,
      // Combined context string ready for GPT prompt injection
      structured_context: structuredContext,
      full_text: fullText,
    });

  } catch (error) {
    console.error('[textractDocument] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});