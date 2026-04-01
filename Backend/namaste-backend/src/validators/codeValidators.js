const { z } = require("zod");

const searchSchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  searchWithin: z.string().optional(),
  onlyActive: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === "boolean") return value;
      return String(value).toLowerCase() === "true";
    }),
  minConfidence: z.coerce.number().min(0).max(1).optional()
});

const aiSearchSchema = z.object({
  text: z.string().min(1),
  aiEnabled: z.boolean(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

const mlFeedbackSchema = z.object({
  query: z.string().min(1),
  predictedCode: z.string().optional(),
  confidence: z.coerce.number().min(0).max(1).optional(),
  reason: z.string().optional()
});

const conceptRequestSchema = z.object({
  term: z.string().min(1),
  description: z.string().min(1),
  suggestedCode: z.string().min(1),
  suggestedSystem: z.string().min(1),
  reason: z.string().optional()
});

const translateSchema = z.object({
  code: z.string().min(1),
  from: z.string().min(1)
});

const conceptDetailSchema = z.object({
  code: z.string().min(1),
  system: z.string().min(1)
});

const resolveCodeSchema = z.object({
  code: z.string().min(1),
  system: z.string().min(1)
});

const addDoctorMappingSchema = z.object({
  fromSystem: z.string().min(1),
  fromCode: z.string().min(1),
  toSystem: z.string().min(1),
  toCode: z.string().min(1),
  mappingType: z.enum(["EQUIVALENT", "BROADER", "NARROWER", "RELATED"]),
  confidence: z.coerce.number().min(0).max(1).optional()
});

const deactivateDoctorConceptSchema = z.object({
  reason: z.string().min(1).optional()
});

module.exports = {
  searchSchema,
  aiSearchSchema,
  mlFeedbackSchema,
  conceptRequestSchema,
  translateSchema,
  conceptDetailSchema,
  resolveCodeSchema,
  addDoctorMappingSchema,
  deactivateDoctorConceptSchema
};
