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

// ── Confidence metrics helper ─────────────────────────────────────────────────

function computeConfidenceMetrics(blocks, kvPairs) {
  const wordBlocks = blocks.filter(b => b.BlockType === 'WORD' && b.Confidence != null);
  if (!wordBlocks.length) return { avg_word_confidence: null, low_confidence_word_count: 0, kv_avg_confidence: null };
  const avg = wordBlocks.reduce((s, b) => s + b.Confidence, 0) / wordBlocks.length;
  const low = wordBlocks.filter(b => b.Confidence < 80).length;
  const kvAvg = kvPairs.length
    ? Math.round(kvPairs.reduce((s, p) => s + p.confidence, 0) / kvPairs.length)
    : null;
  return {
    avg_word_confidence: Math.round(avg * 10) / 10,
    low_confidence_word_count: low,
    kv_avg_confidence: kvAvg,
  };
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
    const t0 = Date.now();

    // ── Step 1: Fetch PDF ───────────────────────────────────────────────────────
    console.log('[textractDocument] Fetching PDF from:', file_url);
    const fetchRes = await fetch(file_url);
    if (!fetchRes.ok) {
      return Response.json({ error: `Failed to fetch document: ${fetchRes.status}` }, { status: 400 });
    }
    const pdfBytes = new Uint8Array(await fetchRes.arrayBuffer());
    const fetchMs = Date.now() - t0;
    console.log(`[textractDocument] PDF size: ${pdfBytes.length} bytes, fetch: ${fetchMs}ms`);

    // ── Step 2: Upload to S3 with owner metadata ────────────────────────────────
    // Key format: textract-tmp/{owner_id}/{timestamp}-{random}.pdf
    const rand = Math.random().toString(36).slice(2, 8);
    const s3Key = `textract-tmp/${user.id}/${Date.now()}-${rand}.pdf`;
    console.log('[textractDocument] Uploading to S3:', s3Key);

    const t1 = Date.now();
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: pdfBytes,
      ContentType: 'application/pdf',
      // Owner isolation metadata — never exposed publicly
      Metadata: {
        'owner-id': user.id,
        'uploaded-at': new Date().toISOString(),
        'source': 'elitetc-textract-pipeline',
      },
    }));
    console.log(`[textractDocument] S3 upload: ${Date.now() - t1}ms`);

    // ── Step 3: Textract AnalyzeDocument ───────────────────────────────────────
    console.log('[textractDocument] Running Textract AnalyzeDocument (FORMS + TABLES)...');
    const t2 = Date.now();
    let textractResult;
    try {
      textractResult = await textract.send(new AnalyzeDocumentCommand({
        Document: { S3Object: { Bucket: bucket, Name: s3Key } },
        FeatureTypes: ['FORMS', 'TABLES'],
      }));
    } finally {
      // ── Step 4: Always delete temp S3 object ──────────────────────────────────
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: s3Key }));
        console.log('[textractDocument] Deleted temp S3 object');
      } catch (delErr) {
        console.warn('[textractDocument] Failed to delete S3 temp:', delErr.message);
      }
    }
    const textractMs = Date.now() - t2;

    const blocks = textractResult.Blocks || [];
    const pageCount = blocks.length > 0 ? Math.max(...blocks.map(b => b.Page || 1)) : 0;
    console.log(`[textractDocument] Textract: ${blocks.length} blocks, ${pageCount} pages, ${textractMs}ms`);

    // ── Step 5: Normalize ──────────────────────────────────────────────────────
    const t3 = Date.now();
    const pageMap    = buildPageMap(blocks);
    const kvPairs    = buildKeyValuePairs(blocks);
    const tables     = buildTables(blocks);
    const checkboxes = buildCheckboxes(blocks);
    const pageTexts  = buildPageText(pageMap, blocks);
    const metrics    = computeConfidenceMetrics(blocks, kvPairs);
    console.log(`[textractDocument] Normalization: ${Date.now() - t3}ms | KV pairs: ${kvPairs.length} | Tables: ${tables.length} | Checkboxes: ${checkboxes.length}`);
    console.log(`[textractDocument] Confidence: avg_word=${metrics.avg_word_confidence}% kv_avg=${metrics.kv_avg_confidence}% low_conf_words=${metrics.low_confidence_word_count}`);

    // Build full text corpus
    const fullText = Object.keys(pageTexts)
      .sort((a, b) => Number(a) - Number(b))
      .map(pg => `--- PAGE ${pg} ---\n${pageTexts[pg]}`)
      .join('\n\n');

    // Build structured context for GPT — chunked by section type
    const kvSection = kvPairs.length
      ? `\n=== KEY-VALUE PAIRS (${kvPairs.length} total) ===\n${formatKVPairs(kvPairs)}`
      : '';
    const tableSection = tables.length
      ? `\n=== TABLES (${tables.length} total) ===\n${formatTables(tables)}`
      : '';
    const checkboxSection = checkboxes.length
      ? `\n=== CHECKBOXES (${checkboxes.filter(c => c.status === 'SELECTED').length} checked / ${checkboxes.length} total) ===\n` +
        checkboxes.map(c => `  pg${c.page} top=${c.top.toFixed(3)} left=${c.left.toFixed(3)}: ${c.status} (${c.confidence}%)`).join('\n')
      : '';

    const structuredContext = [
      `=== FULL TEXT (${pageCount} pages) ===\n${fullText}`,
      kvSection,
      tableSection,
      checkboxSection,
    ].filter(Boolean).join('\n');

    const totalMs = Date.now() - t0;
    console.log(`[textractDocument] Total pipeline: ${totalMs}ms`);

    return Response.json({
      success: true,
      // Metrics
      timing_ms: { fetch: fetchMs, s3_upload: t1 ? Date.now() - t1 : null, textract: textractMs, total: totalMs },
      page_count: pageCount,
      block_count: blocks.length,
      kv_pair_count: kvPairs.length,
      table_count: tables.length,
      checkbox_count: checkboxes.length,
      confidence_metrics: metrics,
      // Structured data (for downstream use)
      page_texts: pageTexts,
      kv_pairs: kvPairs,
      tables,
      checkboxes,
      // GPT-ready context
      structured_context: structuredContext,
      full_text: fullText,
    });

  } catch (error) {
    console.error('[textractDocument] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});