const prisma = require("../config/prisma");
const ImportHistory = require("../models/ImportHistory");
const { normalizeCodeSystem, normalizeCode } = require("../utils/normalizers");

function relevanceScore(concept, qLower) {
  const code = (concept.code || "").toLowerCase();
  const name = (concept.displayName || "").toLowerCase();
  const desc = (concept.description || "").toLowerCase();

  if (code === qLower) return 500;
  if (code.startsWith(qLower)) return 420;
  if (code.includes(qLower)) return 360;
  if (name === qLower) return 330;
  if (name.startsWith(qLower)) return 280;
  if (name.includes(qLower)) return 230;
  if (desc.includes(qLower)) return 170;
  return 100;
}

function toCodeDTO(concept) {
  return { code: concept.code, displayName: concept.displayName };
}

function applySystemCode(suggestion, concept) {
  if (!concept || !concept.codeSystem?.name) return;
  const code = toCodeDTO(concept);

  if (concept.codeSystem.name === "NAMASTE") suggestion.namaste = code;
  if (concept.codeSystem.name === "ICD11_TM2") suggestion.tm2 = code;
  if (concept.codeSystem.name === "ICD11_BIOMED") suggestion.biomed = code;
}

function buildSuggestion(baseConcept, relatedConcepts = []) {
  const suggestion = {
    id: baseConcept.id,
    displayName: baseConcept.displayName,
    description: baseConcept.description || "",
    matchedSystem: baseConcept.codeSystem.name,
    matchedCode: baseConcept.code,
    active: baseConcept.lifecycleStatus === "ACTIVE"
  };

  applySystemCode(suggestion, baseConcept);
  for (const concept of relatedConcepts) {
    applySystemCode(suggestion, concept);
  }

  return suggestion;
}

async function getOrCreateCodeSystem(name) {
  const normalized = normalizeCodeSystem(name);
  let system = await prisma.codeSystem.findUnique({ where: { name: normalized } });

  if (!system) {
    system = await prisma.codeSystem.create({
      data: { name: normalized, version: "1.0", isActive: true }
    });
  }

  return system;
}

async function getConceptByCodeAndSystem(code, systemName) {
  const normalizedSystem = normalizeCodeSystem(systemName);
  const normalizedCodeVal = normalizeCode(code);

  return prisma.concept.findFirst({
    where: {
      code: normalizedCodeVal,
      lifecycleStatus: "ACTIVE",
      codeSystem: { name: normalizedSystem }
    },
    include: { codeSystem: true }
  });
}

async function getConceptByCodeAnySystem(code) {
  const normalizedCodeVal = normalizeCode(code);
  return prisma.concept.findFirst({
    where: { code: normalizedCodeVal, lifecycleStatus: "ACTIVE" },
    include: { codeSystem: true }
  });
}

async function createConcept(data) {
  const codeSystem = await getOrCreateCodeSystem(data.systemName);
  const normalizedCodeVal = normalizeCode(data.code);

  return prisma.concept.upsert({
    where: {
      code_systemId: {
        code: normalizedCodeVal,
        systemId: codeSystem.id
      }
    },
    update: {
      displayName: data.displayName,
      description: data.description || "",
      isActive: data.isActive !== false,
      lifecycleStatus: data.lifecycleStatus || "ACTIVE",
      deactivatedAt: data.deactivatedAt || null,
      archivedAt: data.archivedAt || null,
      tags: data.tags || []
    },
    create: {
      code: data.code,
      displayName: data.displayName,
      description: data.description || "",
      isActive: data.isActive !== false,
      lifecycleStatus: data.lifecycleStatus || "ACTIVE",
      deactivatedAt: data.deactivatedAt || null,
      archivedAt: data.archivedAt || null,
      tags: data.tags || [],
      systemId: codeSystem.id
    },
    include: { codeSystem: true }
  });
}

async function getRelatedConcepts(conceptId) {
  const mappings = await prisma.mapping.findMany({
    where: {
      OR: [{ sourceConceptId: conceptId }, { targetConceptId: conceptId }]
    },
    include: {
      sourceConcept: { include: { codeSystem: true } },
      targetConcept: { include: { codeSystem: true } }
    }
  });

  const related = [];
  for (const mapping of mappings) {
    if (mapping.sourceConceptId !== conceptId) related.push(mapping.sourceConcept);
    if (mapping.targetConceptId !== conceptId) related.push(mapping.targetConcept);
  }

  return related;
}

async function search(query, limit = 10, searchWithin = "ALL", onlyActive = false) {
  const normalized = (query || "").trim();
  if (!normalized) return { suggestions: [], count: 0 };

  const within = normalizeCodeSystem(searchWithin || "ALL");
  const qLower = normalized.toLowerCase();
  const codeNorm = normalizeCode(query);

  const concepts = await prisma.concept.findMany({
    where: {
      AND: [
        onlyActive ? { isActive: true } : {},
        { lifecycleStatus: "ACTIVE" },
        within !== "ALL" ? { codeSystem: { name: within } } : {},
        {
          OR: [
            { code: { contains: codeNorm, mode: "insensitive" } },
            { displayName: { contains: normalized, mode: "insensitive" } },
            { description: { contains: normalized, mode: "insensitive" } }
          ]
        }
      ]
    },
    include: { codeSystem: true },
    take: 300
  });

  const ranked = concepts
    .map((c) => ({ c, score: relevanceScore(c, qLower) }))
    .sort((a, b) => b.score - a.score || a.c.displayName.localeCompare(b.c.displayName))
    .slice(0, limit);

  const suggestions = [];
  for (const { c } of ranked) {
    const related = await getRelatedConcepts(c.id);
    suggestions.push(buildSuggestion(c, related));
  }

  return { suggestions, count: suggestions.length };
}

async function findRequestedConceptByQuery(query, searchWithin = "ALL") {
  const normalized = (query || "").trim();
  if (!normalized) return null;
  const within = normalizeCodeSystem(searchWithin || "ALL");

  return prisma.concept.findFirst({
    where: {
      AND: [
        { lifecycleStatus: { in: ["INACTIVE", "ARCHIVED"] } },
        { tags: { has: "REQUESTED_CONCEPT" } },
        within !== "ALL" ? { codeSystem: { name: within } } : {},
        {
          OR: [
            { displayName: { contains: normalized, mode: "insensitive" } },
            { code: { contains: normalized, mode: "insensitive" } },
            { description: { contains: normalized, mode: "insensitive" } }
          ]
        }
      ]
    },
    include: { codeSystem: true }
  });
}

async function translateCode(code, fromSystem) {
  const normalized = normalizeCode(code);
  const base = await getConceptByCodeAndSystem(normalized, fromSystem);
  if (!base) throw new Error(`Code not found: ${code}`);

  const related = await getRelatedConcepts(base.id);
  return buildSuggestion(base, related);
}

async function getStats() {
  const [totalConcepts, totalMappings, activeSystems, recentImports] = await Promise.all([
    prisma.concept.count(),
    prisma.mapping.count(),
    prisma.codeSystem.count({ where: { isActive: true } }),
    ImportHistory.countDocuments()
  ]);

  return { totalConcepts, totalMappings, activeSystems, recentImports };
}

async function getConceptDetail(code, system) {
  const normalized = normalizeCode(code);
  const base = await getConceptByCodeAndSystem(normalized, system);
  if (!base) return null;

  const mappings = await prisma.mapping.findMany({
    where: {
      OR: [{ sourceConceptId: base.id }, { targetConceptId: base.id }]
    },
    include: {
      sourceConcept: { include: { codeSystem: true } },
      targetConcept: { include: { codeSystem: true } }
    }
  });

  const mapped = mappings.map((m) => {
    const isSource = m.sourceConceptId === base.id;
    const other = isSource ? m.targetConcept : m.sourceConcept;
    return {
      toCodeSystem: other.codeSystem.name,
      code: other.code,
      mappingType: m.mappingType || "EQUIVALENT",
      confidence: m.confidence
    };
  });

  return {
    displayName: base.displayName,
    code: base.code,
    codeSystem: base.codeSystem.name,
    description: base.description || "",
    active: Boolean(base.isActive),
    lifecycleStatus: base.lifecycleStatus,
    mappings: mapped
  };
}

async function getMappingRelations(code, system) {
  const base = await getConceptByCodeAndSystem(code, system);
  if (!base) return [];

  const mappings = await prisma.mapping.findMany({
    where: {
      status: "VERIFIED",
      OR: [{ sourceConceptId: base.id }, { targetConceptId: base.id }]
    },
    include: {
      sourceConcept: { include: { codeSystem: true } },
      targetConcept: { include: { codeSystem: true } }
    }
  });

  return mappings.map((m) => {
    const isSource = m.sourceConceptId === base.id;
    const other = isSource ? m.targetConcept : m.sourceConcept;
    return {
      toCodeSystem: other.codeSystem.name,
      code: other.code,
      mappingType: (m.mappingType || "EQUIVALENT").toUpperCase(),
      confidence: m.confidence
    };
  });
}

async function searchMappings(q, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const where = q ? {
    OR: [
      {
        sourceConcept: {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } }
          ]
        }
      },
      {
        targetConcept: {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } }
          ]
        }
      }
    ],
    status: "VERIFIED"
  } : {
    status: "VERIFIED"
  };

  const [total, rows] = await Promise.all([
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

  return {
    total,
    page,
    limit,
    rows: rows.map(m => ({
      id: m.id,
      sourceConceptId: m.sourceConceptId,
      targetConceptId: m.targetConceptId,
      sourceSystem: m.sourceConcept.codeSystem.name,
      sourceCode: m.sourceConcept.code,
      sourceLabel: m.sourceConcept.displayName,
      targetSystem: m.targetConcept.codeSystem.name,
      targetCode: m.targetConcept.code,
      targetLabel: m.targetConcept.displayName,
      relationship: (m.mappingType || "EQUIVALENT").toLowerCase(),
      status: m.status,
      confidence: m.confidence,
      createdAt: m.createdAt
    }))
  };
}

module.exports = {
  search,
  translateCode,
  getStats,
  getConceptDetail,
  getMappingRelations,
  searchMappings,
  getOrCreateCodeSystem,
  getConceptByCodeAndSystem,
  getConceptByCodeAnySystem,
  findRequestedConceptByQuery,
  createConcept
};
