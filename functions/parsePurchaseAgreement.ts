import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Normalize extracted PDF text
function normalizeText(text) {
  return text
    .replace(/\r\n/g, " ")
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Shared date pattern supporting both MM/DD/YYYY and Month DD, YYYY formats
const datePattern = "(\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}|[A-Za-z]+\\s\\d{1,2},\\s\\d{4})";

// Parse date string to ISO format
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Handle MM/DD/YYYY format
  const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    const [_, month, day, year] = slashMatch;
    const fullYear = year.length === 2 ? (parseInt(year) > 50 ? "19" + year : "20" + year) : year;
    return `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  
  // Handle Month DD, YYYY format
  const monthMatch = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
  if (monthMatch) {
    const months = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
                     Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
    const month = months[monthMatch[1].substring(0, 3)];
    if (month) {
      return `${monthMatch[3]}-${month}-${String(monthMatch[2]).padStart(2, "0")}`;
    }
  }
  
  return null;
}

// Extract dates with flexible pattern matching
function extractDateFlexible(text, patterns) {
  for (const pattern of patterns) {
    const regex = new RegExp(`${pattern}[^0-9]*${datePattern}`, "i");
    const match = text.match(regex);
    if (match && match[2]) {
      const parsed = parseDate(match[2]);
      if (parsed) return parsed;
    }
  }
  return null;
}

// Extract days offset from text
function extractDaysOffset(text, patterns) {
  for (const pattern of patterns) {
    const regex = new RegExp(`${pattern}[^0-9]*within\\s+([0-9]+)\\s+days`, "i");
    const match = text.match(regex);
    if (match && match[1]) {
      return parseInt(match[1]);
    }
  }
  return null;
}

// Safe extraction with fallback
function safeExtract(text, patterns, extractor) {
  try {
    return extractor(text, patterns);
  } catch (e) {
    console.warn("Extraction error:", e.message);
    return null;
  }
}

// Fallback regex-based P&S parser for when LLM fails
function parseViRegex(text) {
  console.log("Starting regex-based P&S parsing...");
  
  const result = {
    effectiveDate: null,
    closingDate: null,
    transferOfTitleDate: null,
    earnestMoneyDays: null,
    additionalDepositDate: null,
    inspectionDays: null,
    generalBuildingInspectionDays: null,
    sewageInspectionDays: null,
    waterQualityInspectionDays: null,
    radonInspectionDays: null,
    dueDiligenceDays: null,
    financingCommitmentDate: null,
    purchasePrice: null,
    buyerName: null,
    sellerName: null,
    buyersAgentName: null,
    sellersAgentName: null,
    buyerBrokerage: null,
    sellerBrokerage: null,
    closingTitleCompany: null,
    propertyAddress: null,
    section20AdditionalProvisions: null,
    section20Concessions: null,
    section20ProfessionalFee: null,
    professionalFeeType: null,
    professionalFeeValue: null,
    professionalFeeBase: null,
    sellerConcessionAmount: null,
    sellerConcessionPercent: null,
    additionalCompensationNotes: null,
  };

  // Extract dates
  result.effectiveDate = safeExtract(text, [
    "effective date",
    "date of acceptance",
    "acceptance date"
  ], extractDateFlexible);

  result.closingDate = safeExtract(text, [
    "closing",
    "transfer of title",
    "closing date"
  ], extractDateFlexible);

  result.transferOfTitleDate = safeExtract(text, [
    "transfer of title"
  ], extractDateFlexible);

  result.financingCommitmentDate = safeExtract(text, [
    "financial commitment",
    "financing commitment",
    "financing deadline"
  ], extractDateFlexible);

  // Extract days offsets
  result.earnestMoneyDays = safeExtract(text, [
    "earnest money",
    "earnest deposit"
  ], extractDaysOffset);

  result.inspectionDays = safeExtract(text, [
    "general building inspection",
    "inspection"
  ], extractDaysOffset);

  result.generalBuildingInspectionDays = result.inspectionDays;

  result.dueDiligenceDays = safeExtract(text, [
    "due diligence"
  ], extractDaysOffset);

  // Extract names and entities with flexible patterns
  const buyerMatch = text.match(/between\s+(.*?)\s+\(["']?buyer/i);
  result.buyerName = buyerMatch ? buyerMatch[1].trim() : null;

  const sellerMatch = text.match(/and\s+(.*?)\s+\(["']?seller/i);
  result.sellerName = sellerMatch ? sellerMatch[1].trim() : null;

  // Agent names (flexible pattern matching)
  const buyerAgentMatch = text.match(/(?:selling agent|buyer.{0,20}agent)[:\s]+([A-Za-z\s]+?)(?:\n|$|[,;])/i);
  result.buyersAgentName = buyerAgentMatch ? buyerAgentMatch[1].trim() : null;

  const sellerAgentMatch = text.match(/(?:listing agent|seller.{0,20}agent)[:\s]+([A-Za-z\s]+?)(?:\n|$|[,;])/i);
  result.sellersAgentName = sellerAgentMatch ? sellerAgentMatch[1].trim() : null;

  // Brokerage names
  const buyerBrokerageMatch = text.match(/(?:selling brokerage|buyer.{0,20}brokerage)[:\s]+([A-Za-z0-9\s&.,]+?)(?:\n|$|[,;])/i);
  result.buyerBrokerage = buyerBrokerageMatch ? buyerBrokerageMatch[1].trim() : null;

  const sellerBrokerageMatch = text.match(/(?:listing brokerage|seller.{0,20}brokerage)[:\s]+([A-Za-z0-9\s&.,]+?)(?:\n|$|[,;])/i);
  result.sellerBrokerage = sellerBrokerageMatch ? sellerBrokerageMatch[1].trim() : null;

  // Title company
  const titleCompanyMatch = text.match(/(?:closing|title company|settlement agent)[:\s]+([A-Za-z0-9\s&.,]+?)(?:\n|$|[,;])/i);
  result.closingTitleCompany = titleCompanyMatch ? titleCompanyMatch[1].trim() : null;

  console.log("Regex parsing complete. Found:", {
    effectiveDate: result.effectiveDate,
    closingDate: result.closingDate,
    buyerName: result.buyerName,
    sellerName: result.sellerName
  });

  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { text } = body;

    if (!text) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    // Normalize the text
    const normalized = normalizeText(text);
    console.log("Normalized P&S Text (first 500 chars):", normalized.substring(0, 500));

    // Parse dates with flexible patterns
    const effectiveDate = safeExtract(normalized, [
      "effective date",
      "date of acceptance",
      "acceptance date"
    ], extractDate);

    const closingDate = safeExtract(normalized, [
      "closing",
      "transfer of title",
      "closing date"
    ], extractDate);

    const transferOfTitleDate = safeExtract(normalized, [
      "transfer of title"
    ], extractDate);

    const financingCommitmentDate = safeExtract(normalized, [
      "financial commitment",
      "financing commitment",
      "financing deadline"
    ], extractDate);

    // Extract days offsets
    const earnestMoneyDays = safeExtract(normalized, [
      "earnest money",
      "earnest deposit"
    ], extractDaysOffset);

    const inspectionDays = safeExtract(normalized, [
      "general building inspection",
      "inspection"
    ], extractDaysOffset);

    const dueDiligenceDays = safeExtract(normalized, [
      "due diligence"
    ], extractDaysOffset);

    // Extract names and entities
    const buyerMatch = normalized.match(/between\s+(.*?)\s+\(["']?buyer/i);
    const buyerName = buyerMatch ? buyerMatch[1].trim() : null;

    const sellerMatch = normalized.match(/and\s+(.*?)\s+\(["']?seller/i);
    const sellerName = sellerMatch ? sellerMatch[1].trim() : null;

    const buyerAgentMatch = normalized.match(/selling agent[:\s]+([A-Za-z\s]+?)(?:\n|$|[,;])/i);
    const buyerAgent = buyerAgentMatch ? buyerAgentMatch[1].trim() : null;

    const sellerAgentMatch = normalized.match(/listing agent[:\s]+([A-Za-z\s]+?)(?:\n|$|[,;])/i);
    const sellerAgent = sellerAgentMatch ? sellerAgentMatch[1].trim() : null;

    const buyerBrokerageMatch = normalized.match(/selling brokerage[:\s]+([A-Za-z0-9\s&.,]+?)(?:\n|$|[,;])/i);
    const buyerBrokerage = buyerBrokerageMatch ? buyerBrokerageMatch[1].trim() : null;

    const sellerBrokerageMatch = normalized.match(/listing brokerage[:\s]+([A-Za-z0-9\s&.,]+?)(?:\n|$|[,;])/i);
    const sellerBrokerage = sellerBrokerageMatch ? sellerBrokerageMatch[1].trim() : null;

    const titleCompanyMatch = normalized.match(/closing[^:]*:[^:]*([A-Za-z0-9\s&.,]+)/i);
    const titleCompany = titleCompanyMatch ? titleCompanyMatch[1].trim() : null;

    // Return safe structured object
    const result = {
      effectiveDate: effectiveDate || null,
      closingDate: closingDate || null,
      transferOfTitleDate: transferOfTitleDate || null,
      earnestMoneyDays: earnestMoneyDays || null,
      additionalDepositDate: null,
      inspectionDays: inspectionDays || null,
      generalBuildingInspectionDays: inspectionDays || null,
      sewageInspectionDays: null,
      waterQualityInspectionDays: null,
      radonInspectionDays: null,
      dueDiligenceDays: dueDiligenceDays || null,
      financingCommitmentDate: financingCommitmentDate || null,
      purchasePrice: null,
      buyerName: buyerName || null,
      sellerName: sellerName || null,
      buyersAgentName: buyerAgent || null,
      sellersAgentName: sellerAgent || null,
      buyerBrokerage: buyerBrokerage || null,
      sellerBrokerage: sellerBrokerage || null,
      closingTitleCompany: titleCompany || null,
      propertyAddress: null,
      section20AdditionalProvisions: null,
      section20Concessions: null,
      section20ProfessionalFee: null,
      professionalFeeType: null,
      professionalFeeValue: null,
      professionalFeeBase: null,
      sellerConcessionAmount: null,
      sellerConcessionPercent: null,
      additionalCompensationNotes: null,
    };

    return Response.json(result);
  } catch (error) {
    console.error("Parser error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});