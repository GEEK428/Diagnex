const prisma = require("../config/prisma");
const csvImportService = require("../services/csvImportService");
const { normalizeCodeSystem, normalizeCode } = require("../utils/normalizers");
const { logAction } = require("../services/auditService");
const ConceptRequest = require("../models/ConceptRequest");
const { syncToMLInBackground } = require("../services/mlSyncService");
const User = require("../models/User");
const MlFeedback = require("../models/MlFeedback");
const ImportHistory = require("../models/ImportHistory");
const Notification = require("../models/Notification");

const ALLOWED_MAPPING_TYPES = new Set(["EQUIVALENT", "BROADER", "NARROWER", "RELATED"]);

async function importNamasteCsv(req, res) {
  try {
    const result = await csvImportService.importConceptsFromCsv(
      req.file,
      "NAMASTE",
      "",
      req.user?.email || "system"
    );

    return res.json({
      status: "SUCCESS",
      imports: [
        {
          id: result._id.toString(),
          time: result.importTime,
          codeSystem: result.codeSystem,
          fileName: result.fileName,
          rowCount: result.rowCount,
          status: result.status
        }
      ],
      totalRows: result.rowCount
    });
  } catch (error) {
    return res.status(400).json({ status: "FAILED", message: error.message });
  }
}

async function importConceptsFromCsv(req, res) {
  try {
    const codeSystems = [];

    if (req.body.codeSystems) {
      if (Array.isArray(req.body.codeSystems)) {
        codeSystems.push(...req.body.codeSystems.filter(Boolean));
      } else {
        codeSystems.push(req.body.codeSystems);
      }
    }

    if (!codeSystems.length && req.body.codeSystem) {
      codeSystems.push(req.body.codeSystem);
    }

    if (!codeSystems.length) {
      return res.status(400).json({
        status: "FAILED",
        message: "At least one code system is required"
      });
    }

    const importedBy = req.user?.email || "unknown";
    const reportDescription = req.body.reportDescription || "";
    const imports = [];
    let totalRows = 0;

    for (const target of codeSystems) {
      const result = await csvImportService.importConceptsFromCsv(
        req.file,
        target,
        reportDescription,
        importedBy
      );

      imports.push({
        id: result._id.toString(),
        time: result.importTime,
        codeSystem: result.codeSystem,
        fileName: result.fileName,
        rowCount: result.rowCount,
        status: result.status
      });

      totalRows += result.rowCount || 0;
    }

    return res.json({ status: "SUCCESS", imports, totalRows });
  } catch (error) {
    return res.status(400).json({ status: "FAILED", message: error.message });
  }
}

async function getImportHistory(req, res) {
  try {
    const importedBy = req.user?.email || "unknown";
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const skip = (page - 1) * limit;

    const total = await ImportHistory.countDocuments({ 
      importedBy: { $regex: new RegExp(`^${importedBy}$`, "i") },
      isDeleted: { $ne: true }
    });

    const rows = await ImportHistory.find({ 
      importedBy: { $regex: new RegExp(`^${importedBy}$`, "i") },
      isDeleted: { $ne: true }
    })
    .sort({ importTime: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

    // Fetch all display names for lookups
    const systemsMap = await prisma.codeSystem.findMany({ select: { name: true, displayName: true } });
    const nameToDisplay = {};
    systemsMap.forEach((s) => { nameToDisplay[s.name] = s.displayName; });

    return res.json({
      total,
      page,
      limit,
      rows: rows.map((row) => ({
        id: row._id.toString(),
        importTime: row.importTime,
        codeSystem: nameToDisplay[row.codeSystem] || row.codeSystem,
        fileName: row.fileName,
        rowCount: row.rowCount,
        status: row.status,
        reportDescription: row.reportDescription,
        importedBy: row.importedBy,
        errorMessage: row.errorMessage || ""
      }))
    });
  } catch (error) {
    return res.status(400).json({ status: "FAILED", message: error.message });
  }
}

async function getAdminDashboardImports(req, res) {
  try {
    const importedBy = req.user?.email || "unknown";
    const rows = await ImportHistory.find({ 
      importedBy: { $regex: new RegExp(`^${importedBy}$`, "i") },
      isDeleted: { $ne: true }
    })
    .sort({ importTime: -1 })
    .limit(5)
    .lean();

    const systemsMap = await prisma.codeSystem.findMany({ select: { name: true, displayName: true } });
    const nameToDisplay = {};
    systemsMap.forEach((s) => { nameToDisplay[s.name] = s.displayName; });

    return res.json(
      rows.map((row) => ({
        id: row._id.toString(),
        importTime: row.importTime,
        codeSystem: nameToDisplay[row.codeSystem] || row.codeSystem,
        fileName: row.fileName,
        rowCount: row.rowCount,
        status: row.status
      }))
    );
  } catch (error) {
    return res.status(400).json({ status: "FAILED", message: error.message });
  }
}

async function deleteImportHistory(req, res) {
  try {
    await csvImportService.deleteImportHistory(req.params.id);
    return res.json({ status: "SUCCESS", message: "History deleted" });
  } catch (error) {
    return res.status(400).json({ status: "FAILED", message: error.message });
  }
}

async function downloadImportHistoryFile(req, res) {
  try {
    const row = await csvImportService.getImportHistoryById(req.params.id);

    if (!row.fileContent || !row.fileContent.length) {
      return res
        .status(404)
        .json({ status: "FAILED", message: "No file stored for this record" });
    }

    const fileName = row.fileName || `import-${row._id.toString()}.csv`;

    res.setHeader("Content-Disposition", `attachment; filename=\"${fileName}\"`);
    res.setHeader("Content-Type", row.fileContentType || "text/csv");

    return res.send(row.fileContent);
  } catch (error) {
    return res.status(400).json({ status: "FAILED", message: error.message });
  }
}

async function getCodeSystems(req, res) {
  try {
    const systems = await prisma.codeSystem.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { concepts: true } }
      }
    });
    return res.json(
      systems.map((item) => ({
        id: item.id,
        name: item.name,
        displayName: item.displayName || item.name,
        description: item.description || "Terminology authority source",
        type: item.type || "LOCAL",
        version: item.version,
        isActive: item.isActive,
        sourceUrl: item.sourceUrl,
        conceptCount: item._count?.concepts || 0,
        lastUpdated: item.updatedAt
      }))
    );
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function createCodeSystem(req, res) {
  try {
    const data = {
      name: normalizeCodeSystem(req.body.name),
      displayName: req.body.displayName.trim(),
      description: req.body.description?.trim() || "",
      type: req.body.type,
      version: req.body.version.trim(),
      sourceUrl: req.body.sourceUrl || null,
      isActive: true,
      createdBy: req.user?.email || "system"
    };

    const existing = await prisma.codeSystem.findUnique({ where: { name: data.name } });
    if (existing) throw new Error("Code system already exists");

    const created = await prisma.codeSystem.create({ data });
    await logAction({
      userId: req.user?._id?.toString() || null,
      action: "CREATE_CODE_SYSTEM",
      endpoint: "/admin/code-systems",
      details: `${created.name} (${created.version})`
    });

    return res.json({
      id: created.id,
      name: created.name,
      displayName: created.displayName || created.name,
      description: created.description || "",
      type: created.type || "LOCAL",
      version: created.version,
      isActive: created.isActive,
      sourceUrl: created.sourceUrl,
      conceptCount: 0,
      lastUpdated: created.updatedAt
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function updateCodeSystem(req, res) {
  try {
    const id = Number(req.params.id);
    const data = {};

    if (req.body.name !== undefined) data.name = normalizeCodeSystem(req.body.name);
    if (req.body.displayName !== undefined) data.displayName = req.body.displayName.trim();
    if (req.body.description !== undefined) data.description = req.body.description.trim();
    if (req.body.type !== undefined) data.type = req.body.type;
    if (req.body.version !== undefined) data.version = req.body.version;
    if (req.body.sourceUrl !== undefined) data.sourceUrl = req.body.sourceUrl;

    const current = await prisma.codeSystem.findUnique({ where: { id } });
    if (!current) throw new Error("Code system not found");

    const updated = await prisma.$transaction(async (tx) => {
      const cs = await tx.codeSystem.update({ where: { id }, data });
      
      // Auto-create SystemVersion if version changed
      if (data.version && data.version !== current.version) {
        const conceptCount = await tx.concept.count({ where: { systemId: id } });
        await tx.systemVersion.create({
          data: {
            systemId: id,
            version: data.version,
            conceptCount: conceptCount,
            importedBy: req.user?.email || "system",
            notes: "Version updated via admin panel"
          }
        });
      }
      return cs;
    });

    await logAction({
      userId: req.user?._id?.toString() || null,
      action: "UPDATE_CODE_SYSTEM",
      endpoint: `/admin/code-systems/${id}`,
      details: `${updated.name} updated`
    });

    return res.json({
      id: updated.id,
      name: updated.name,
      displayName: updated.displayName || updated.name,
      description: updated.description || "",
      type: updated.type || "LOCAL",
      version: updated.version,
      isActive: updated.isActive,
      sourceUrl: updated.sourceUrl,
      lastUpdated: updated.updatedAt
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function setCodeSystemActive(req, res) {
  try {
    const id = Number(req.params.id);
    const active = String(req.query.active).toLowerCase() === "true";

    const updated = await prisma.$transaction(async (tx) => {
      const cs = await tx.codeSystem.update({
        where: { id },
        data: { isActive: active }
      });

      // Cascade update to concepts whether activating or deactivating
      await tx.concept.updateMany({
        where: { systemId: id },
        data: { isActive: active }
      });

      return cs;
    });

    await logAction({
      userId: req.user?._id?.toString() || null,
      action: active ? "SYSTEM_ACTIVATED" : "SYSTEM_DEACTIVATED",
      endpoint: `/admin/code-systems/${id}/active`,
      details: `${updated.name} -> active=${active}`
    });

    return res.json({
      id: updated.id,
      name: updated.name,
      displayName: updated.displayName || updated.name,
      description: updated.description || "",
      type: updated.type || "LOCAL",
      version: updated.version,
      isActive: updated.isActive,
      sourceUrl: updated.sourceUrl,
      lastUpdated: updated.updatedAt
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function getCodeSystemVersions(req, res) {
  try {
    const id = Number(req.params.id);
    const rows = await prisma.systemVersion.findMany({
      where: { systemId: id },
      orderBy: { importedAt: "desc" },
      take: 100
    });
    return res.json(rows);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function addMapping(req, res) {
  try {
    const userId = req.user?._id?.toString() || null;
    const fromSystem = normalizeCodeSystem(req.body.fromSystem);
    const toSystem = normalizeCodeSystem(req.body.toSystem);
    const mappingType = String(req.body.mappingType || "EQUIVALENT").toUpperCase();

    if (!ALLOWED_MAPPING_TYPES.has(mappingType)) {
      throw new Error("Invalid mapping type. Use EQUIVALENT, BROADER, NARROWER, or RELATED.");
    }

    const fromCodeNorm = normalizeCode(req.body.fromCode);
    const toCodeNorm = normalizeCode(req.body.toCode);

    const [fromConcept, toConcept] = await Promise.all([
      prisma.concept.findFirst({
        where: { code: fromCodeNorm, codeSystem: { name: fromSystem } }
      }),
      prisma.concept.findFirst({
        where: { code: toCodeNorm, codeSystem: { name: toSystem } }
      })
    ]);

    if (!fromConcept) throw new Error("From concept not found");
    if (!toConcept) throw new Error("To concept not found");
    if (fromConcept.lifecycleStatus !== "ACTIVE" || toConcept.lifecycleStatus !== "ACTIVE") {
      throw new Error("Mappings can only be created between ACTIVE concepts.");
    }

    const duplicate = await prisma.mapping.findFirst({
      where: {
        sourceConceptId: fromConcept.id,
        targetConceptId: toConcept.id,
        status: { in: ["ACTIVE", "VERIFIED", "PENDING"] }
      }
    });

    if (duplicate) {
      throw new Error("This exact mapping relation has already been added to the clinical vault.");
    }

    const mapping = await prisma.mapping.create({
      data: {
        sourceConceptId: fromConcept.id,
        targetConceptId: toConcept.id,
        mappingType,
        confidence: req.body.confidence || 1.0,
        createdBy: req.user?.email || "system",
        status: "VERIFIED", // Manual admin mappings are auto-verified
        verifiedBy: req.user?.email || "system",
        verifiedAt: new Date()
      }
    });

    await logAction({
      userId,
      action: "ADD_MAPPING",
      endpoint: "/admin/mappings",
      details: `${fromSystem}:${req.body.fromCode} -> ${toSystem}:${req.body.toCode} (${mappingType})`
    });

    return res.json(mapping);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function getMappings(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "").toUpperCase();
    const systemName = String(req.query.system || "").trim();
    const mappingTypeGroup = String(req.query.mappingType || "").toUpperCase();
    const minConf = Number(req.query.minConfidence || 0);
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const skip = (page - 1) * limit;

    const where = {
      ...(status ? { status } : {}),
      ...(mappingTypeGroup && mappingTypeGroup !== "ALL" ? { mappingType: mappingTypeGroup } : {}),
      ...(minConf > 0 ? { confidence: { gte: minConf } } : {}),
      ...(systemName
        ? {
            OR: [
              { sourceConcept: { codeSystem: { name: systemName } } },
              { targetConcept: { codeSystem: { name: systemName } } }
            ]
          }
        : {}),
      ...(q
        ? {
            OR: [
              { mappingType: { contains: q, mode: "insensitive" } },
              {
                sourceConcept: {
                  OR: [
                    { code: { contains: normalizeCode(q), mode: "insensitive" } },
                    { displayName: { contains: q, mode: "insensitive" } }
                  ]
                }
              },
              {
                targetConcept: {
                  OR: [
                    { code: { contains: normalizeCode(q), mode: "insensitive" } },
                    { displayName: { contains: q, mode: "insensitive" } }
                  ]
                }
              }
            ]
          }
        : {}),
      // Default filter to hide soft-deleted (INACTIVE) mappings if no specific status is requested
      ...(!status ? { status: { not: "INACTIVE" } } : {})
    };

    const [total, mappings] = await Promise.all([
      prisma.mapping.count({ where }),
      prisma.mapping.findMany({
        where,
        include: {
          sourceConcept: { include: { codeSystem: true } },
          targetConcept: { include: { codeSystem: true } }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      })
    ]);

    return res.json({
      total,
      page,
      limit,
      rows: mappings.map((m) => ({
        id: m.id,
        sourceSystem: m.sourceConcept.codeSystem.name,
        sourceCode: m.sourceConcept.code,
        sourceLabel: m.sourceConcept.displayName,
        targetSystem: m.targetConcept.codeSystem.name,
        targetCode: m.targetConcept.code,
        targetLabel: m.targetConcept.displayName,
        relationship: String(m.mappingType || "EQUIVALENT").toLowerCase(),
        status: m.status,
        confidence: m.confidence,
        createdBy: m.createdBy,
        createdAt: m.createdAt,
        verifiedBy: m.verifiedBy,
        verifiedAt: m.verifiedAt,
        rejectionReason: m.rejectionReason,
        isSystemActive: m.sourceConcept.codeSystem.isActive && m.targetConcept.codeSystem.isActive
      }))
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function verifyMapping(req, res) {
  try {
    const id = Number(req.params.id);
    const updated = await prisma.mapping.update({
      where: { id },
      data: {
        status: "VERIFIED",
        verifiedBy: req.user?.email || "system",
        verifiedAt: new Date()
      },
      include: {
        sourceConcept: true,
        targetConcept: true
      }
    });

    // ML Feedback Loop: Manual verification is the highest quality training data
    syncToMLInBackground([{
      sourceCode: updated.sourceConcept.code,
      sourceLabel: updated.sourceConcept.displayName,
      targetCode: updated.targetConcept.code,
      targetLabel: updated.targetConcept.displayName,
      relationship: updated.mappingType || "EQUIVALENT",
      confidence: 1.0, // Manual verification is 100% confidence
      isVerified: true
    }]);

    await logAction({
      userId: req.user?._id?.toString() || null,
      action: "VERIFY_MAPPING",
      endpoint: `/admin/mappings/${id}/verify`,
      details: `Mapping ${id} verified by ${req.user?.email}`
    });

    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function rejectMapping(req, res) {
  try {
    const id = Number(req.params.id);
    const { reason } = req.body;

    const updated = await prisma.mapping.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason || "No reason provided",
        verifiedBy: req.user?.email || "system",
        verifiedAt: new Date()
      }
    });

    await logAction({
      userId: req.user?._id?.toString() || null,
      action: "REJECT_MAPPING",
      endpoint: `/admin/mappings/${id}/reject`,
      details: `Mapping ${id} rejected: ${reason}`
    });

    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function bulkVerifyMappings(req, res) {
  try {
    const { ids, action } = req.body; // action: 'VERIFY' or 'REJECT'
    if (!Array.isArray(ids) || !ids.length) throw new Error("No IDs provided");

    const status = action === "REJECT" ? "REJECTED" : "VERIFIED";

    const result = await prisma.mapping.updateMany({
      where: { id: { in: ids.map(Number) } },
      data: {
        status,
        verifiedBy: req.user?.email || "system",
        verifiedAt: new Date()
      }
    });

    await logAction({
      userId: req.user?._id?.toString() || null,
      action: `BULK_${action}_MAPPINGS`,
      endpoint: "/admin/mappings/bulk-verify",
      details: `${result.count} mappings ${status.toLowerCase()}`
    });

    return res.json({ status: "SUCCESS", count: result.count });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function deleteMapping(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw new Error("Invalid mapping id");

    const existing = await prisma.mapping.findUnique({ where: { id } });
    if (!existing) throw new Error("Mapping not found");

    // Soft delete by marking as INACTIVE
    await prisma.mapping.update({ 
      where: { id }, 
      data: { status: "INACTIVE" } 
    });

    await logAction({
      userId: req.user?._id?.toString() || null,
      action: "SOFT_DELETE_MAPPING",
      endpoint: `/admin/mappings/${id}`,
      details: `Mapping ${id} marked as INACTIVE`
    });

    return res.json({ status: "SUCCESS", message: "Mapping archived successfully" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function getConceptRequests(req, res) {
  try {
    const adminEmail = req.user?.email || "unknown";
    const status = String(req.query.status || "PENDING").toUpperCase();
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const skip = (page - 1) * limit;
    
    // 1. Identify all Doctors who are linked to this Admin
    const linkedDoctors = await User.find({ adminEmail: { $regex: new RegExp(`^${adminEmail}$`, "i") } }).select("email name hospital").lean();
    const doctorEmails = linkedDoctors.map(d => d.email);

    // 2. Filter requests by these doctors
    const query = { 
      status, 
      requestedBy: { $in: doctorEmails } 
    };
    
    const [total, requests] = await Promise.all([
      ConceptRequest.countDocuments(query),
      ConceptRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);
    
    const enriched = requests.map((r) => {
      const user = linkedDoctors.find(d => d.email === r.requestedBy);
      return { 
        ...r, 
        doctorName: user?.name || r.requestedBy,
        hospital: user?.hospital || "N/A"
      };
    });

    return res.json({
      total,
      page,
      limit,
      rows: enriched
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function approveConceptRequest(req, res) {
  try {
    const { id } = req.params;
    const { code, system, term, description, tags = [] } = req.body;

    if (!code || !system || !term) throw new Error("Code, system and term are required");

    const request = await ConceptRequest.findById(id);
    if (!request) throw new Error("Concept request not found");
    if (request.status !== "PENDING") throw new Error("Request already processed");

    const systemRecord = await prisma.codeSystem.findUnique({ where: { name: system } });
    if (!systemRecord) throw new Error(`Code system ${system} not found`);

    // Check for duplicate before creating
    const existing = await prisma.concept.findUnique({
      where: { code_systemId: { code: code.trim().toUpperCase(), systemId: systemRecord.id } }
    });

    let concept;
    if (existing) {
       // Just use existing concept and mark request as approved
       concept = existing;
    } else {
       // Create in PostgreSQL
       concept = await prisma.concept.create({
         data: {
           code: code.trim().toUpperCase(),
           displayName: term.trim(),
           description: description?.trim() || "",
           systemId: systemRecord.id,
           isActive: true,
           tags: [...tags, "APPROVED_REQUEST"],
           createdBy: req.user?.email || "admin" // Track creator
         }
       });

       // ONLY sync to ML if it's a NEW concept
       syncToMLInBackground([{
         code: concept.code,
         displayName: concept.displayName,
         description: concept.description || "",
         tags: concept.tags || []
       }]);
    }

    // Update MongoDB (Always do this for both new and existing concepts to mark the request as processed)
    request.status = "APPROVED";
    request.finalCode = concept.code;
    request.processedBy = req.user?.email || "admin";
    request.processedAt = new Date();
    await request.save();

    await logAction({
      userId: req.user?._id?.toString() || null,
      action: "APPROVE_CONCEPT_REQUEST",
      endpoint: `/admin/concept-requests/${id}/approve`,
      details: `Approved ${term} -> ${system}:${code}`
    });

    return res.json({ status: "SUCCESS", concept });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function rejectConceptRequest(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await ConceptRequest.findById(id);
    if (!request) throw new Error("Concept request not found");
    if (request.status !== "PENDING") throw new Error("Request already processed");

    request.status = "REJECTED";
    request.rejectionReason = reason || "Declined by administrator";
    request.processedBy = req.user?.email || "admin";
    request.processedAt = new Date();
    await request.save();

    await logAction({
      userId: req.user?._id?.toString() || null,
      action: "REJECT_CONCEPT_REQUEST",
      endpoint: `/admin/concept-requests/${id}/reject`,
      details: `Rejected request for ${request.term}: ${reason}`
    });

    return res.json({ status: "SUCCESS" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function getMlFeedback(req, res) {
  try {
    const adminEmail = req.user?.email || "unknown";
    const linkedDoctors = await User.find({ adminEmail: { $regex: new RegExp(`^${adminEmail}$`, "i") } }).select("_id").lean();
    const doctorIds = linkedDoctors.map(d => d._id.toString());

    const reviewed = req.query.reviewed === "true";
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const skip = (page - 1) * limit;

    const query = { 
      reviewed,
      userId: { $in: doctorIds } 
    };
    
    if (req.query.minConf) query.confidence = { $gte: Number(req.query.minConf) };
    
    const [total, feedback] = await Promise.all([
      MlFeedback.countDocuments(query),
      MlFeedback.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);

    return res.json({
      total,
      page,
      limit,
      rows: feedback
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function markMlFeedbackReviewed(req, res) {
  try {
    const { id } = req.params;
    const { decision = "ACCEPTED" } = req.body; // Default to ACCEPTED if just "Acknowledging"

    const updated = await MlFeedback.findByIdAndUpdate(id, {
      reviewed: true,
      adminDecision: decision, 
      reviewedBy: req.user?.email || "admin",
      reviewedAt: new Date()
    }, { new: true });

    await logAction({
      userId: req.user?._id?.toString() || null,
      action: decision === "ACCEPTED" ? "ACCEPT_ML_FEEDBACK" : "IGNORE_ML_FEEDBACK",
      endpoint: `/admin/ml-feedback/${id}/review`,
      details: `${decision}: ${updated.query}`
    });

    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ status: "FAILED", message: error.message });
  }
}

async function bulkReviewMlFeedback(req, res) {
  try {
    const { ids, decision = "ACCEPTED" } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No IDs provided" });
    }

    const result = await MlFeedback.updateMany(
      { _id: { $in: ids } },
      {
        reviewed: true,
        adminDecision: decision,
        reviewedBy: req.user?.email || "admin",
        reviewedAt: new Date()
      }
    );

    await logAction({
      userId: req.user?._id?.toString() || null,
      action: "BULK_REVIEW_ML_FEEDBACK",
      endpoint: "/admin/ml-feedback/bulk-review",
      details: `Bulk ${decision} for ${ids.length} entries`
    });

    return res.json({ success: true, count: result.modifiedCount });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function getMlFeedbackStats(req, res) {
  try {
    const adminEmail = req.user?.email || "unknown";
    const linkedDoctors = await User.find({ adminEmail: { $regex: new RegExp(`^${adminEmail}$`, "i") } }).select("_id").lean();
    const doctorIds = linkedDoctors.map(d => d._id.toString());

    const query = { userId: { $in: doctorIds } };
    const total = await MlFeedback.countDocuments(query);
    const corrected = await MlFeedback.countDocuments({ ...query, feedbackType: "corrected" });
    const pending = await MlFeedback.countDocuments({ ...query, reviewed: false });
    
    return res.json({
      total,
      correctionRate: total > 0 ? (corrected / total) * 100 : 0,
      pendingCount: pending
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function exportMlFeedbackCsv(req, res) {
  try {
    // ONLY export reviewed clinical signals that haven't been exported yet
    // Confirmed ones must be 'Acredited/Acknowledged' (ACCEPTED) and Corrected ones must be 'Approved' (ACCEPTED)
    const query = {
      adminDecision: "ACCEPTED",
      exportStatus: "DRAFT"
    };

    const feedback = await MlFeedback.find(query).sort({ createdAt: -1 }).lean();
    
    if (!feedback.length) {
      return res.status(400).json({ message: "No new validated training data available for export." });
    }

    const header = "query,predicted_code,predicted_system,correct_code,correct_system,feedback_type,confidence,date\n";
    const rows = feedback.map(f => {
      const q = `\"${(f.query || "").replace(/\"/g, '\"\"')}\"`;
      return `${q},${f.predictedCode || ""},${f.predictedSystem || ""},${f.correctCode || ""},${f.correctSystem || ""},${f.feedbackType},${f.confidence || 0},${f.createdAt.toISOString()}`;
    }).join("\n");

    // Atomically mark these records as EXPORTED to prevent duplicate training
    const ids = feedback.map(f => f._id);
    await MlFeedback.updateMany(
      { _id: { $in: ids } },
      { $set: { exportStatus: "EXPORTED" } }
    );

    await logAction({
      userId: req.user?._id?.toString() || null,
      action: "ML_FEEDBACK_EXPORT",
      endpoint: "/admin/ml-feedback/export",
      details: `Exported ${feedback.length} unique clinical intelligence signals for model retraining.`
    });

    res.setHeader("Content-Disposition", "attachment; filename=\"diagnex_retraining_set.csv\"");
    res.setHeader("Content-Type", "text/csv");
    return res.status(200).send(header + rows);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function getAdminDashboardStats(req, res) {
  try {
    const userEmail = req.user?.email || "unknown";
    const userId = req.user?._id?.toString() || null;

    // 1. Stat Cards (Now Personal to ensure 'Fresh Start' for every user)
    const totalConcepts = await prisma.concept.count({ where: { createdBy: userEmail } });
    const totalMappings = await prisma.mapping.count({ where: { createdBy: userEmail } });
    const activeSystemsCount = await prisma.codeSystem.count({ where: { createdBy: userEmail, isActive: true } });
    const totalImports = await ImportHistory.countDocuments({ importedBy: { $regex: new RegExp(`^${userEmail}$`, "i") } });

    // 2. Alert Banners (NOW FILTERED by Linked Doctors)
    const linkedDoctors = await User.find({ adminEmail: { $regex: new RegExp(`^${userEmail}$`, "i") } }).select("email _id").lean();
    const doctorEmails = linkedDoctors.map(d => d.email);
    const doctorIds = linkedDoctors.map(d => d._id.toString());

    const pendingConceptRequests = await ConceptRequest.countDocuments({ 
      status: "PENDING",
      requestedBy: { $in: doctorEmails }
    });
    const mlFeedbackQueue = await MlFeedback.countDocuments({ 
      reviewed: false,
      userId: { $in: doctorIds }
    });
    
    // Concepts approaching archive (INACTIVE for > 80 days - Personal)
    const eightyDaysAgo = new Date(Date.now() - 80 * 24 * 60 * 60 * 1000);
    const approachingArchive = await prisma.concept.count({
      where: {
        lifecycleStatus: "INACTIVE",
        deactivatedAt: { lte: eightyDaysAgo },
        createdBy: userEmail
      }
    });

    // 3. Search Volume (Last 7 Days - Consolidated from all linked doctors)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const searchStats = await MlFeedback.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, userId: { $in: doctorIds } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 4. Mapping Coverage per System
    const systems = await prisma.codeSystem.findMany({
      select: { id: true, name: true, displayName: true }
    });

    const mappingCoverage = await Promise.all(systems.map(async (s) => {
      const totalInSystem = await prisma.concept.count({ where: { systemId: s.id } });
      const withMappings = await prisma.concept.count({
        where: {
          systemId: s.id,
          OR: [
            { mappingsFrom: { some: {} } },
            { mappingsTo: { some: {} } }
          ]
        }
      });

      return {
        system: s.displayName || s.name,
        percentage: totalInSystem > 0 ? (withMappings / totalInSystem) * 100 : 0,
        total: totalInSystem,
        mapped: withMappings
      };
    }));

    return res.json({
      stats: {
        totalConcepts,
        totalMappings,
        activeSystems: activeSystemsCount,
        recentImports: totalImports // Total imports history count
      },
      alerts: {
        pendingConceptRequests,
        mlFeedbackQueue,
        approachingArchive
      },
      searchVolume: searchStats,
      mappingCoverage
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function deactivateConcept(req, res) {
  try {
    const system = normalizeCodeSystem(req.body.codeSystem);

    const concept = await prisma.concept.findFirst({
      where: {
        code: req.body.code,
        codeSystem: { name: system }
      }
    });

    if (!concept) throw new Error("Concept not found");

    const updated = await prisma.concept.update({
      where: { id: concept.id },
      data: {
        isActive: false,
        lifecycleStatus: "INACTIVE",
        deactivatedAt: new Date(),
        archivedAt: null
      }
    });

    await logAction({
      userId: req.user?._id?.toString() || null,
      action: "CONCEPT_DEACTIVATED",
      endpoint: "/admin/concepts/deactivate",
      details: `${system}:${req.body.code}`
    });

    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function getArchivedConcepts(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const concepts = await prisma.concept.findMany({
      where: {
        lifecycleStatus: "ARCHIVED",
        ...(q
          ? {
              OR: [
                { code: { contains: q, mode: "insensitive" } },
                { displayName: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: { codeSystem: true },
      orderBy: { archivedAt: "desc" },
      take: 300
    });

    return res.json(
      concepts.map((c) => ({
        id: c.id,
        code: c.code,
        displayName: c.displayName,
        description: c.description || "",
        codeSystem: c.codeSystem.name,
        deactivatedAt: c.deactivatedAt,
        archivedAt: c.archivedAt
      }))
    );
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}


async function getNotifications(req, res) {
  try {
    const email = req.user?.email || "";
    // Only show UNREAD notifications to keep the interface clean for the admin
    const notifications = await Notification.find({ 
      recipientEmail: email, 
      status: "UNREAD" 
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json(notifications);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function markNotificationRead(req, res) {
  try {
    const id = req.params.id;
    await Notification.findByIdAndUpdate(id, { status: "READ" });
    return res.json({ status: "SUCCESS" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function approveDoctor(req, res) {
  try {
    const { doctorId, notificationId } = req.body;
    const user = await User.findById(doctorId);
    if (!user) throw new Error("Doctor not found");

    user.registrationStatus = "APPROVED";
    user.enabled = true;
    await user.save();

    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, { status: "READ" });
    }

    await logAction({
      userId: req.user?._id?.toString() || null,
      action: "APPROVE_DOCTOR",
      details: `Approved doctor registration for ${user.email}`
    });

    return res.json({ status: "SUCCESS", message: "Doctor approved successfully" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function rejectDoctor(req, res) {
  try {
    const { doctorId, notificationId, reason } = req.body;
    const user = await User.findById(doctorId);
    if (!user) throw new Error("Doctor not found");

    const doctorEmail = user.email;
    const rejectionReason = reason || "Registration criteria not met.";
    
    // Permanently remove the user so they can re-register
    await User.findByIdAndDelete(doctorId);

    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, { status: "READ" });
    }

    await logAction({
      userId: req.user?._id?.toString() || null,
      action: "REJECT_DOCTOR",
      details: `Permanently deleted doctor registration for ${doctorEmail}. Reason: ${rejectionReason}`
    });

    return res.json({ status: "SUCCESS", message: "Doctor registration rejected and deleted." });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function bulkRejectConceptRequests(req, res) {
  try {
    const { ids, reason } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) throw new Error("No request IDs provided");

    const result = await ConceptRequest.updateMany(
      { _id: { $in: ids }, status: "PENDING" },
      { 
        $set: { 
          status: "REJECTED", 
          reason: reason || "Does not meet current clinical terminology requirements.",
          processedBy: req.user?.email || "admin",
          processedAt: new Date()
        } 
      }
    );

    await logAction({
      userId: req.user?._id?.toString() || null,
      action: "BULK_REJECT_CONCEPT_REQUESTS",
      endpoint: "/admin/concept-requests/bulk-reject",
      details: `Bulk rejected ${result.modifiedCount} concept requests`
    });

    return res.json({ status: "SUCCESS", count: result.modifiedCount });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

module.exports = {
  importNamasteCsv,
  importConceptsFromCsv,
  getImportHistory,
  deleteImportHistory,
  downloadImportHistoryFile,
  getCodeSystems,
  createCodeSystem,
  updateCodeSystem,
  setCodeSystemActive,
  getCodeSystemVersions,
  getMappings,
  addMapping,
  verifyMapping,
  rejectMapping,
  bulkVerifyMappings,
  deleteMapping,
  deactivateConcept,
  getArchivedConcepts,
  getConceptRequests,
  approveConceptRequest,
  rejectConceptRequest,
  bulkRejectConceptRequests,
  getAdminDashboardStats,
  getAdminDashboardImports,
  getMlFeedback,
  markMlFeedbackReviewed,
  bulkReviewMlFeedback,
  getMlFeedbackStats,
  exportMlFeedbackCsv,
  getNotifications,
  markNotificationRead,
  approveDoctor,
  rejectDoctor
};
