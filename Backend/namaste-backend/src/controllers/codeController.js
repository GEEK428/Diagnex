const codeSearchService = require("../services/codeSearchService");
const { predictCode, getTrainStatus } = require("../services/mlService");
const MlFeedback = require("../models/MlFeedback");
const ConceptRequest = require("../models/ConceptRequest");
const { logAction } = require("../services/auditService");
const { syncToMLInBackground } = require("../services/mlSyncService");
const { normalizeCode } = require("../utils/normalizers");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const LOW_CONFIDENCE_THRESHOLD = 0.45;

function getConfidenceBand(confidence) {
  if (confidence >= 0.8) return "strong";
  if (confidence >= 0.6) return "medium";
  if (confidence >= 0.45) return "low";
  return "very_low";
}

const HIGH_CONFIDENCE = 0.80;
const MEDIUM_CONFIDENCE = 0.60;
const MIN_CONFIDENCE = 0.45;

async function searchCodes(req, res) {
  const userId = req.user?._id?.toString() || req.headers["x-user-id"] || null;
  const query = req.query.q;
  const limit = req.query.limit || 10;
  const searchWithin = req.query.searchWithin || "ALL";
  const onlyActive = req.query.onlyActive || false;
  const minConfParam = parseFloat(req.query.minConfidence) || MIN_CONFIDENCE;

  try {
    // ── 1. DB search first ───────────────────────────────────────────────────
    const dbResponse = await codeSearchService.search(query, limit, searchWithin, onlyActive);

    if (dbResponse.count > 0) {
      await logAction({
        userId,
        action: "SEARCH",
        endpoint: "/codes/search",
        details: `query=${query}; source=database; hits=${dbResponse.count}`
      });
      return res.json({
        source: "database",
        status: "success",
        confidenceBand: "verified",
        ...dbResponse
      });
    }

    // ── 2. No DB result — try ML fallback ────────────────────────────────────
    let mlResult = null;
    let mlUnavailable = false;

    try {
      mlResult = await predictCode(query);
    } catch {
      mlUnavailable = true;
    }

    // ML service down — return graceful no-result
    if (mlUnavailable || !mlResult) {
      await logAction({
        userId,
        action: "SEARCH",
        endpoint: "/codes/search",
        details: `query=${query}; source=ml; status=ml_unavailable`
      });
      return res.json({
        source: "ml",
        status: "ml_unavailable",
        aiUnavailable: true,
        suggestions: [],
        count: 0,
        message: `No database match found for "${query}". AI service is temporarily unavailable.`
      });
    }

    const predictedCode = readPredictedCode(mlResult);
    const confidence = readConfidence(mlResult) ?? 0;
    const normalizedCode = predictedCode ? predictedCode.trim().toUpperCase() : null;

    // ML returned nothing useful
    if (!normalizedCode) {
      await logAction({ userId, action: "SEARCH", endpoint: "/codes/search",
        details: `query=${query}; source=ml; status=no_match` });
      return res.json({
        source: "ml", status: "no_result", suggestions: [], count: 0,
        message: `No results found for "${query}".`
      });
    }

    let matched = await codeSearchService.getConceptByCodeAnySystem(normalizedCode);
    const band = getConfidenceBand(confidence);

    // AI Hub: Fuzzy Fallback for codes if not found directly
    if (!matched) {
      const stripped = normalizedCode.replace(/[^A-Z0-9]/gi, "");
      matched = await codeSearchService.getConceptByCodeAnySystem(stripped);
      if (!matched && /\d+/.test(normalizedCode)) {
        const numbers = normalizedCode.match(/\d+/)[0];
        const allConcepts = await prisma.concept.findMany({ 
          take: 50, where: { code: { contains: numbers } }, include: { codeSystem: true } 
        });
        if (allConcepts.length > 0) matched = allConcepts[0];
      }
    }

    // VERY LOW confidence (< custom or default) — completely reject
    if (confidence < minConfParam) {
      await logAction({ userId, action: "SEARCH", endpoint: "/codes/search",
        details: `query=${query}; source=ml; status=very_low_confidence; conf=${confidence}` });
      return res.json({
        source: "ml", status: "no_result", suggestions: [], count: 0,
        message: `No reliable results found for "${query}". AI confidence (${Math.round(confidence * 100)}%) was too low.`
      });
    }

    // Prepare translation and return with suggestions as long as it's above threshold
    let suggestions = [];
    if (matched) {
       const translated = await codeSearchService.translateCode(matched.code, matched.codeSystem.name);
       translated.confidenceScore = confidence;
       translated.confidenceBand = band;
       translated.source = "ml";
       suggestions = [translated];
    } else {
       // Code predicted but not in DB
       return res.json({
         source: "ml", status: "no_result", confidenceBand: band, confidence,
         suggestions: [], count: 0,
         message: `Semantic Recommendation: [${normalizedCode}]. AI predicted this concept but it is not currently indexed in your active clinical authority.`
       });
    }

    await logAction({ userId, action: "SEARCH", endpoint: "/codes/search",
      details: `query=${query}; source=ml; status=success; conf=${confidence}; band=${band}` });

    return res.json({
      source: "ml",
      status: confidence >= MEDIUM_CONFIDENCE ? (confidence >= HIGH_CONFIDENCE ? "success" : "medium_confidence") : "low_confidence",
      confidenceBand: band,
      confidence,
      suggestions,
      count: suggestions.length
    });

  } catch (error) {
    console.error("SEARCH_FAILURE_LOG:", error);
    return res.status(500).json({ message: "Search failed", error: error.message, stack: error.stack });
  }
}

async function translateCode(req, res) {
  try {
    const userId = req.user?._id?.toString() || req.headers["x-user-id"] || null;

    await logAction({
      userId,
      action: "TRANSLATE",
      endpoint: "/codes/translate",
      details: `${req.query.code} from ${req.query.from}`
    });

    const result = await codeSearchService.translateCode(req.query.code, req.query.from);
    return res.json(result);
  } catch (error) {
    return res.status(404).json({ message: error.message || "Code not found" });
  }
}

function readPredictedCode(payload) {
  return payload?.predicted_code || payload?.predictedCode || payload?.code || null;
}

function readConfidence(payload) {
  const value = payload?.confidence || payload?.confidence_score || payload?.score;
  if (value === undefined || value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function aiSearch(req, res) {
  if (!req.body.aiEnabled) {
    return res.status(400).json({ message: "AI search is disabled" });
  }

  const userId = req.user?._id?.toString() || req.headers["x-user-id"] || null;

  await logAction({
    userId,
    action: "AI_SEARCH",
    endpoint: "/codes/ai-search",
    details: req.body.text
  });

  try {
    const minConfParam = parseFloat(req.body.minConfidence) || LOW_CONFIDENCE_THRESHOLD;
    const ml = await predictCode(req.body.text);
    const predictedCode = readPredictedCode(ml);
    const confidence = readConfidence(ml) ?? 0;

    if (confidence < minConfParam) {
      await MlFeedback.create({
        query: req.body.text,
        predictedCode: predictedCode || "REJECTED",
        correctCode: "",
        userId,
        confidence,
        status: "very_low_confidence",
        resolvedInDb: false,
        source: ml?.source || "model"
      });
      return res.status(200).json({
        suggestions: [],
        count: 0,
        status: "no_result",
        message: `Match rejected: AI confidence (${Math.round(confidence * 100)}%) is below your minimum threshold of ${Math.round(minConfParam * 100)}%.`
      });
    }

    if (!predictedCode) {
      await MlFeedback.create({
        query: req.body.text,
        predictedCode: null,
        correctCode: "",
        userId,
        confidence: 0,
        status: "no_match",
        resolvedInDb: false,
        source: "model"
      });
      return res.status(200).json({
        suggestions: [],
        count: 0,
        status: "no_result",
        message: `No AI match found for "${req.body.text}".`
      });
    }

    const normalizedPredictedCode = predictedCode.trim().toUpperCase();
    let matched = await codeSearchService.getConceptByCodeAnySystem(normalizedPredictedCode);

    if (!matched) {
      const stripped = normalizedPredictedCode.replace(/[^A-Z0-9]/gi, "");
      matched = await codeSearchService.getConceptByCodeAnySystem(stripped);
      if (!matched && /\d+/.test(normalizedPredictedCode)) {
        const numbers = normalizedPredictedCode.match(/\d+/)[0];
        const all = await prisma.concept.findMany({ 
          take: 50, where: { code: { contains: numbers } }, include: { codeSystem: true } 
        });
        if (all.length > 0) matched = all[0];
      }
    }

    if (confidence < LOW_CONFIDENCE_THRESHOLD) {
      return res.status(200).json({
        suggestions: [],
        count: 0,
        status: matched ? "best_guess" : "no_result",
        confidence,
        confidenceBand: "very_low",
        bestGuess: matched
          ? {
              code: normalizedPredictedCode,
              confidence
            }
          : null,
        message: matched
          ? `Best guess: ${normalizedPredictedCode} (${Math.round(
              confidence * 100
            )}% confidence) - too low to display as final result.`
          : `No reliable AI match found for "${req.body.text}".`
      });
    }

    if (!matched) {
      return res.status(200).json({
        suggestions: [],
        count: 0,
        status: "no_result",
        confidence,
        confidenceBand: getConfidenceBand(confidence),
        message: `AI predicted ${normalizedPredictedCode}, but no matching concept exists in database.`
      });
    }

    const translated = await codeSearchService.translateCode(matched.code, matched.codeSystem.name);

    translated.confidenceScore = confidence;
    translated.confidenceBand = getConfidenceBand(confidence);

    return res.json({ suggestions: [translated], count: 1 });
  } catch (error) {
    return res.status(200).json({
      aiUnavailable: true,
      suggestions: [],
      count: 0,
      status: "ml_unavailable",
      message: "AI search is temporarily unavailable."
    });
  }
}

async function mlTrainStatus(req, res) {
  try {
    const status = await getTrainStatus();
    return res.json(status);
  } catch (error) {
    return res.status(502).json({ message: "Unable to reach ML train status endpoint" });
  }
}

async function submitMlFeedback(req, res) {
  try {
    const userId = req.user?._id?.toString() || req.headers["x-user-id"] || null;
    const { 
      query, 
      predictedCode, 
      predictedSystem, 
      correctCode, 
      correctSystem, 
      feedbackType, 
      confidence 
    } = req.body;

    const payload = await MlFeedback.create({
      query,
      predictedCode: predictedCode || "UNMATCHED",
      predictedSystem: predictedSystem || "NAMASTE",
      correctCode: feedbackType === "confirmed" ? predictedCode : (correctCode || ""),
      correctSystem: feedbackType === "confirmed" ? predictedSystem : (correctSystem || ""),
      feedbackType: feedbackType || "confirmed",
      userId,
      confidence: confidence ?? null,
      reviewed: false,
      adminDecision: "PENDING"
    });

    await logAction({
      userId,
      action: "ML_FEEDBACK_SUBMIT",
      endpoint: "/codes/ml-feedback",
      details: feedbackType === "confirmed" ? `Confirmed: ${query}` : `Corrected: ${query} -> ${correctCode}`
    });

    return res.json({ status: "SUCCESS", id: payload._id });
  } catch (error) {
    return res.status(400).json({ status: "FAILED", message: error.message });
  }
}

async function requestConceptAddition(req, res) {
  try {
    const requestedBy = req.user?.email || req.headers["x-user-id"] || "anonymous";
    const normalizedTerm = req.body.term.trim();
    const suggestedSystem = req.body.suggestedSystem || "NAMASTE";
    const suggestedCode = req.body.suggestedCode || "";
    const description = req.body.description || "";
    const reason = req.body.reason || "";

    const payload = await ConceptRequest.create({
      term: normalizedTerm,
      description,
      suggestedCode,
      suggestedSystem,
      reason,
      requestedBy
    });

    await logAction({
      userId: req.user?._id?.toString() || null,
      action: "CONCEPT_REQUEST_SUBMIT",
      endpoint: "/codes/concept-requests",
      details: `Requested: ${normalizedTerm} -> ${suggestedSystem}`
    });

    return res.json({
      status: "SUCCESS",
      message: "Your request has been submitted and will be reviewed by an administrator",
      id: payload._id.toString()
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to submit request", error: err.message });
  }
}

async function getMyConceptRequests(req, res) {
  try {
    const requestedBy = req.user?.email || req.headers["x-user-id"];
    if (!requestedBy) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const requests = await ConceptRequest.find({ requestedBy }).sort({ createdAt: -1 });
    return res.json(requests);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch concept requests" });
  }
}

async function stats(req, res) {
  try {
    const response = await codeSearchService.getStats();
    return res.json(response);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load stats" });
  }
}

async function getDoctorDashboardStats(req, res) {
  try {
    const userId = req.user?._id?.toString() || req.headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const AuditLog = require("../models/AuditLog");

    // 1. My Recent Searches
    const recentSearches = await AuditLog.find({ userId, action: "SEARCH" })
      .sort({ timestamp: -1 })
      .limit(5);

    // 2. My Requests Statistics
    const myRequests = await ConceptRequest.find({ requestedBy: req.user.email })
      .sort({ createdAt: -1 });
    
    const myRequestsCount = myRequests.filter(r => r.status === 'PENDING').length;
    const totalRequests = myRequests.length;

    // 3. Searches Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const searchesToday = await AuditLog.countDocuments({
      userId,
      action: "SEARCH",
      timestamp: { $gte: today }
    });

    // 4. PostgreSQL Stats
    const pgStats = await codeSearchService.getStats();

    return res.json({
      recentSearches,
      myRequests: myRequests.slice(0, 3), // Still only return 3 for the inline preview
      totalRequests,
      myRequestsCount,
      searchesToday,
      totalConcepts: pgStats.totalConcepts || 0,
      activeSystems: pgStats.activeSystems || 0
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load dashboard stats" });
  }
}

async function conceptDetail(req, res) {
  try {
    const detail = await codeSearchService.getConceptDetail(req.query.code, req.query.system);
    if (!detail) return res.status(404).json({ message: "Concept not found" });
    return res.json(detail);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load concept detail" });
  }
}

async function resolveCode(req, res) {
  try {
    const suggestion = await codeSearchService.translateCode(req.query.code, req.query.system);

    const mappings = await codeSearchService.getMappingRelations(req.query.code, req.query.system);

    const grouped = {
      equivalent: mappings.filter((m) => m.mappingType === "EQUIVALENT"),
      broader: mappings.filter((m) => m.mappingType === "BROADER"),
      narrower: mappings.filter((m) => m.mappingType === "NARROWER"),
      related: mappings.filter((m) => m.mappingType === "RELATED")
    };

    const prescriptionHints = [
      ...grouped.equivalent.map((m) => ({
        codeSystem: m.toCodeSystem,
        code: m.code,
        mappingType: "EQUIVALENT",
        note: "Show automatically with full confidence",
        autoSubstitute: true
      })),
      ...grouped.broader.map((m) => ({
        codeSystem: m.toCodeSystem,
        code: m.code,
        mappingType: "BROADER",
        note: "Source is broader than mapped code",
        autoSubstitute: false
      })),
      ...grouped.narrower.map((m) => ({
        codeSystem: m.toCodeSystem,
        code: m.code,
        mappingType: "NARROWER",
        note: "More specific mapping exists",
        autoSubstitute: false
      })),
      ...grouped.related.map((m) => ({
        codeSystem: m.toCodeSystem,
        code: m.code,
        mappingType: "RELATED",
        note: "Related suggestion only",
        autoSubstitute: false
      }))
    ];

    return res.json({
      primary: {
        displayName: suggestion.displayName,
        code: suggestion.matchedCode,
        system: suggestion.matchedSystem
      },
      groupedMappings: grouped,
      prescriptionHints
    });
  } catch (error) {
    return res.status(404).json({ message: error.message || "Code not found" });
  }
}

async function getPublicSystems(req, res) {
  try {
    const systems = await prisma.codeSystem.findMany({
      where: { isActive: true },
      select: { id: true, name: true, displayName: true }
    });
    return res.json(systems);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch code systems" });
  }
}

async function getConceptById(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const concept = await prisma.concept.findUnique({
      where: { id },
      include: {
        codeSystem: true,
        mappingsFrom: {
          where: { status: "VERIFIED" },
          include: { targetConcept: { include: { codeSystem: true } } }
        },
        mappingsTo: {
          where: { status: "VERIFIED" },
          include: { sourceConcept: { include: { codeSystem: true } } }
        }
      }
    });

    if (!concept) return res.status(404).json({ message: "Concept not found" });
    return res.json(concept);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching concept" });
  }
}

async function addDoctorMapping(req, res) {
  try {
    const { fromSystem, fromCode, toSystem, toCode, mappingType, confidence } = req.body;
    
    const sourceSystem = await prisma.codeSystem.findUnique({ where: { name: fromSystem } });
    const targetSystemEntity = await prisma.codeSystem.findUnique({ where: { name: toSystem } });

    if (!sourceSystem || !targetSystemEntity) {
      return res.status(400).json({ message: "Invalid systems specified." });
    }

    if (!targetSystemEntity.isActive) {
      return res.status(400).json({ message: "Target system is currently inactive." });
    }

    const sourceConcept = await prisma.concept.findUnique({
      where: { code_systemId: { code: fromCode, systemId: sourceSystem.id } }
    });
    
    const targetConcept = await prisma.concept.findUnique({
      where: { code_systemId: { code: toCode, systemId: targetSystemEntity.id } }
    });

    if (!sourceConcept) return res.status(404).json({ message: "Source concept not found." });
    if (!targetConcept) return res.status(404).json({ message: "Target concept not found. Please ensure the target code exists in the selected system." });

    const existing = await prisma.mapping.findFirst({
      where: {
        sourceConceptId: sourceConcept.id,
        targetConceptId: targetConcept.id,
        status: { in: ["ACTIVE", "VERIFIED", "PENDING"] }
      }
    });
    if (existing) {
      return res.status(400).json({ message: "This exact mapping relation has already been added to the clinical vault." });
    }

    // Automatically verify doctor-added mappings or set to PENDING based on your business logic.
    // The instructions say "validate target code exists in selected system, check duplicate, create mapping"
    const mapping = await prisma.mapping.create({
      data: {
        sourceConceptId: sourceConcept.id,
        targetConceptId: targetConcept.id,
        mappingType: mappingType || "EQUIVALENT",
        confidence: confidence || 1.0,
        status: "PENDING", // Doctor mappings now require admin approval
        createdBy: req.user?.email || "doctor"
      },
      include: { targetConcept: { include: { codeSystem: true } } }
    });

    await logAction({
      userId: req.user?._id?.toString(),
      action: "MAPPING_CREATED",
      endpoint: "/codes/mappings",
      details: `${fromCode} -> ${toCode} (${mappingType})`
    });

    return res.status(201).json(mapping);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create mapping", error: error.message });
  }
}

async function deactivateDoctorConcept(req, res) {
  try {
    const id = parseInt(req.params.id);
    const reason = req.body.reason || "Doctor deactivated";
    
    const concept = await prisma.concept.update({
      where: { id },
      data: {
        lifecycleStatus: "INACTIVE",
        deactivatedAt: new Date()
      }
    });

    // Cascade mapping status to INACTIVE for source and target
    await prisma.mapping.updateMany({
      where: { OR: [{ sourceConceptId: id }, { targetConceptId: id }] },
      data: { status: "INACTIVE" }
    });

    const scheduledArchiveAt = new Date();
    scheduledArchiveAt.setDate(scheduledArchiveAt.getDate() + 90);

    await logAction({
      userId: req.user?._id?.toString(),
      action: "CONCEPT_DEACTIVATED",
      endpoint: "/codes/concepts/deactivate",
      details: `Concept ${concept.code} deactivated. Reason: ${reason}. Scheduled for archive: ${scheduledArchiveAt.toISOString()}`
    });

    return res.json({ message: "Concept deactivated successfully", concept });
  } catch (error) {
    return res.status(500).json({ message: "Deactivation failed" });
  }
}

async function reactivateDoctorConcept(req, res) {
  try {
    const id = parseInt(req.params.id);
    
    const concept = await prisma.concept.update({
      where: { id },
      data: {
        lifecycleStatus: "ACTIVE",
        deactivatedAt: null
      }
    });

    await prisma.mapping.updateMany({
      where: { OR: [{ sourceConceptId: id }, { targetConceptId: id }] },
      data: { status: "VERIFIED" }
    });

    await logAction({
      userId: req.user?._id?.toString(),
      action: "CONCEPT_REACTIVATED",
      endpoint: "/codes/concepts/reactivate",
      details: `Concept ${concept.code} reactivated.`
    });

    return res.json({ message: "Concept reactivated successfully", concept });
  } catch (error) {
    return res.status(500).json({ message: "Reactivation failed" });
  }
}



async function getMappings(req, res) {
  try {
    const q = req.query.q || "";
    const page = parseInt(req.query.page || "1");
    const result = await codeSearchService.searchMappings(q, page, 20);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: "Failed to search mappings" });
  }
}

module.exports = {
  searchCodes,
  translateCode,
  aiSearch,
  mlTrainStatus,
  submitMlFeedback,
  requestConceptAddition,
  stats,
  getDoctorDashboardStats,
  conceptDetail,
  resolveCode,
  getMyConceptRequests,
  getPublicSystems,
  getConceptById,
  addDoctorMapping,
  deactivateDoctorConcept,
  reactivateDoctorConcept,
  getMappings
};
