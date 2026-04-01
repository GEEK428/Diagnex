const csv = require("csv-parser");
const { Readable } = require("stream");
const prisma = require("../config/prisma");
const ImportHistory = require("../models/ImportHistory");
const logger = require("../config/logger");
const { normalizeCodeSystem, stripBom, normalizeCode } = require("../utils/normalizers");
const { getOrCreateCodeSystem } = require("./codeSearchService");
const { syncToMLInBackground } = require("./mlSyncService");

function parseCsvBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];

    Readable.from([buffer])
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

function extractValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined) return String(row[key]);
  }
  return "";
}

function validateCsvHeaders(row) {
  const originalKeys = Object.keys(row || {});
  const normalizedKeys = originalKeys.map((k) =>
    String(k)
      .replace(/\uFEFF/g, "")
      .trim()
      .toLowerCase()
      .replace(/[_\-\s]/g, "")
  );

  logger.debug("CSV headers detected", { original: originalKeys, normalized: normalizedKeys });

  const hasCode = normalizedKeys.includes("code");
  const hasDisplayName = normalizedKeys.includes("displayname") || normalizedKeys.includes("name");

  // Code and DisplayName are required. Description is optional.
  if (!hasCode || !hasDisplayName) {
    const missing = [];
    if (!hasCode) missing.push("code");
    if (!hasDisplayName) missing.push("displayName/name");
    throw new Error(`Missing required headers: ${missing.join(", ")}. Detected headers: [${originalKeys.join(", ")}]`);
  }
}

async function storeImportHistory(payload) {
  return ImportHistory.create(payload);
}

async function importConceptsFromCsv(file, codeSystemName, reportDescription, importedBy) {
  if (!file || !file.buffer || !file.originalname) {
    throw new Error("CSV file is required");
  }

  const fileName = String(file.originalname || "").toLowerCase();
  if (!fileName.endsWith(".csv")) {
    throw new Error("Invalid file format. Only .csv is accepted.");
  }

  const normalizedSystem = normalizeCodeSystem(codeSystemName);
  // Allow a wider range of characters to support technical IDs and FHIR URIs
  if (!/^[A-Z0-9_\-\.\:\/\?\&\=\@]{2,150}$/i.test(normalizedSystem)) {
    throw new Error(`Invalid code system name: ${codeSystemName}`);
  }

  const fileBuffer = file.buffer;
  let importedRows = 0;

  try {
    const rows = await parseCsvBuffer(fileBuffer);
    if (!rows.length) throw new Error("CSV contains no rows");

    validateCsvHeaders(rows[0]);
    let system = await prisma.codeSystem.findUnique({ where: { name: normalizedSystem } });
    if (system && !system.isActive) {
      throw new Error(`Code system ${normalizedSystem} is inactive. Activate it before import.`);
    }
    if (!system) {
      system = await getOrCreateCodeSystem(normalizedSystem);
    }

    // Efficiently fetch all existing concepts for this system to prevent duplicates
    const existingConcepts = await prisma.concept.findMany({
      where: { systemId: system.id },
      select: { code: true }
    });
    const existingCodes = new Set(existingConcepts.map(c => c.code.toUpperCase()));

    const data = [];
    for (const row of rows) {
      const code = stripBom(extractValue(row, ["code", "Code"]))?.trim();
      const displayName = extractValue(row, ["displayName", "DisplayName", "display_name", "name", "Name"]).trim();
      const description = extractValue(row, ["description", "Description"]).trim();

      if (!code || !displayName) continue;
      
      const normalizedCode = normalizeCode(code);
      
      // If the row specifies a specific system, skip if it doesn't match current target
      const rowSystem = normalizeCodeSystem(extractValue(row, ["system", "System", "codeSystem", "code_system"]));
      if (rowSystem && rowSystem !== normalizedSystem) {
         continue; // Only import if it matches the current target system loop
      }

      if (existingCodes.has(normalizedCode)) {
        continue; // Skip duplicates already in DB or earlier in file
      }

      data.push({
        code: normalizedCode,
        displayName,
        description,
        isActive: true,
        lifecycleStatus: "ACTIVE",
        deactivatedAt: null,
        archivedAt: null,
        systemId: system.id,
        createdBy: importedBy // Set who created this
      });
      existingCodes.add(normalizedCode); // Prevent duplicates within the SAME import too
    }

    const transaction = [];
    for (const item of data) {
      transaction.push(
        prisma.concept.upsert({
          where: { code_systemId: { code: item.code, systemId: item.systemId } },
          update: {
            displayName: item.displayName,
            description: item.description,
            isActive: true,
            lifecycleStatus: "ACTIVE",
            deactivatedAt: null,
            archivedAt: null
          },
          create: item
        })
      );
    }

    await prisma.$transaction(transaction);
    importedRows = data.length;

    const result = await storeImportHistory({
      importTime: new Date(),
      codeSystem: normalizedSystem,
      fileName: file.originalname || "upload.csv",
      rowCount: importedRows,
      status: "SUCCESS",
      reportDescription: reportDescription || "",
      importedBy: importedBy || "unknown",
      fileContent: fileBuffer,
      fileContentType: file.mimetype || "text/csv"
    });

    await prisma.systemVersion.create({
      data: {
        systemId: system.id,
        version: system.version || "1.0",
        conceptCount: importedRows,
        importedBy: importedBy || "unknown",
        notes: reportDescription || null
      }
    });

    // Non-blocking ML sync after successful PostgreSQL import.
    syncToMLInBackground(data.map((item) => ({ ...item, tags: [] })));
    logger.info(`CSV import synced to ML in background`, {
      codeSystem: normalizedSystem,
      rows: data.length
    });

    return result;
  } catch (error) {
    await storeImportHistory({
      importTime: new Date(),
      codeSystem: normalizedSystem,
      fileName: file.originalname || "upload.csv",
      rowCount: importedRows,
      status: "FAILED",
      reportDescription: reportDescription || "",
      importedBy: importedBy || "unknown",
      fileContent: fileBuffer,
      fileContentType: file.mimetype || "text/csv",
      errorMessage: error.message
    });

    throw error;
  }
}

async function getImportHistory() {
  return ImportHistory.find({ isDeleted: { $ne: true } })
    .sort({ importTime: -1 })
    .limit(100)
    .lean();
}

async function getImportHistoryById(id) {
  if (!id || !/^[a-f\d]{24}$/i.test(String(id))) {
    throw new Error("Invalid import history id");
  }
  const row = await ImportHistory.findById(id);
  if (!row) throw new Error("Import history record not found");
  return row;
}

async function deleteImportHistory(id) {
  const row = await getImportHistoryById(id);
  await ImportHistory.findByIdAndUpdate(row._id, { 
    isDeleted: true, 
    deletedAt: new Date() 
  });
}

module.exports = {
  importConceptsFromCsv,
  getImportHistory,
  getImportHistoryById,
  deleteImportHistory
};
