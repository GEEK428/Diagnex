const { z } = require("zod");

const addMappingSchema = z.object({
  fromSystem: z.string().min(1),
  fromCode: z.string().min(1),
  toSystem: z.string().min(1),
  toCode: z.string().min(1),
  mappingType: z.string().optional(),
  confidence: z.coerce.number().min(0).max(1).optional()
});

const deactivateConceptSchema = z.object({
  code: z.string().min(1),
  codeSystem: z.string().min(1)
});

const updateCodeSystemSchema = z.object({
  name: z.string().min(2).optional(),
  displayName: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
  type: z.enum(["AUTHORITY", "LOCAL"]).optional(),
  version: z.string().min(1).optional(),
  sourceUrl: z.string().url().optional()
});

const createCodeSystemSchema = z.object({
  name: z.string().min(2),
  displayName: z.string().min(2),
  description: z.string().min(2).optional(),
  type: z.enum(["AUTHORITY", "LOCAL"]),
  version: z.string().min(1),
  sourceUrl: z.string().url().optional()
});

module.exports = {
  addMappingSchema,
  deactivateConceptSchema,
  updateCodeSystemSchema,
  createCodeSystemSchema
};
