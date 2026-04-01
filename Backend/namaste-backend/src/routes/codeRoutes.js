const express = require("express");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const controller = require("../controllers/codeController");
const {
  searchSchema,
  aiSearchSchema,
  mlFeedbackSchema,
  conceptRequestSchema,
  translateSchema,
  conceptDetailSchema,
  resolveCodeSchema,
  addDoctorMappingSchema,
  deactivateDoctorConceptSchema
} = require("../validators/codeValidators");

const router = express.Router();

router.get("/search", optionalAuth, validate(searchSchema, "query"), controller.searchCodes);
router.get("/translate", optionalAuth, validate(translateSchema, "query"), controller.translateCode);
router.post("/ai-search", optionalAuth, validate(aiSearchSchema), controller.aiSearch);
router.post("/ml-feedback", requireAuth, validate(mlFeedbackSchema), controller.submitMlFeedback);
router.post("/concept-requests", requireAuth, validate(conceptRequestSchema), controller.requestConceptAddition);
router.get("/concept-requests/mine", requireAuth, controller.getMyConceptRequests);
router.get("/ml-train-status", controller.mlTrainStatus);
router.get("/stats", controller.stats);
router.get("/dashboard", requireAuth, controller.getDoctorDashboardStats);
router.get("/concepts/detail", validate(conceptDetailSchema, "query"), controller.conceptDetail);
router.get("/resolve", validate(resolveCodeSchema, "query"), controller.resolveCode);

// Doctor Mappings and Concept Management
router.get("/systems", controller.getPublicSystems);
router.get("/concepts/:id", requireAuth, controller.getConceptById);
router.get("/mappings", requireAuth, controller.getMappings);
router.post("/mappings", requireAuth, validate(addDoctorMappingSchema), controller.addDoctorMapping);
router.patch("/concepts/:id/deactivate", requireAuth, validate(deactivateDoctorConceptSchema), controller.deactivateDoctorConcept);
router.patch("/concepts/:id/reactivate", requireAuth, controller.reactivateDoctorConcept);

module.exports = router;
