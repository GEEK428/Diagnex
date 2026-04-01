const express = require("express");
const upload = require("../middleware/upload");
const validate = require("../middleware/validate");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const controller = require("../controllers/adminController");
const {
  addMappingSchema,
  deactivateConceptSchema,
  updateCodeSystemSchema,
  createCodeSystemSchema
} = require("../validators/adminValidators");

const router = express.Router();

// All admin routes require: 1) valid JWT  2) ADMIN role
router.use(requireAuth);
router.use(requireAdmin);

router.post("/namaste/import", upload.single("file"), controller.importNamasteCsv);
router.post("/import/concepts/csv", upload.single("file"), controller.importConceptsFromCsv);
router.get("/import/history", controller.getImportHistory);
router.delete("/import/history/:id", controller.deleteImportHistory);
router.get("/import/history/:id/download", controller.downloadImportHistoryFile);

router.get("/code-systems", controller.getCodeSystems);
router.post("/code-systems", validate(createCodeSystemSchema), controller.createCodeSystem);
router.put("/code-systems/:id", validate(updateCodeSystemSchema), controller.updateCodeSystem);
router.put("/code-systems/:id/active", controller.setCodeSystemActive);
router.get("/code-systems/:id/versions", controller.getCodeSystemVersions);

router.get("/mappings", controller.getMappings);
router.post("/mappings", validate(addMappingSchema), controller.addMapping);
router.patch("/mappings/:id/verify", controller.verifyMapping);
router.patch("/mappings/:id/reject", controller.rejectMapping);
router.post("/mappings/bulk-verify", controller.bulkVerifyMappings);
router.delete("/mappings/:id", controller.deleteMapping);
router.post("/concepts/deactivate", validate(deactivateConceptSchema), controller.deactivateConcept);
router.get("/concepts/archived", controller.getArchivedConcepts);
router.get("/concept-requests", controller.getConceptRequests);
router.patch("/concept-requests/:id/approve", controller.approveConceptRequest);
router.patch("/concept-requests/:id/reject", controller.rejectConceptRequest);
router.patch("/concept-requests/bulk-reject", controller.bulkRejectConceptRequests);

router.get("/dashboard", controller.getAdminDashboardStats);
router.get("/dashboard/imports", controller.getAdminDashboardImports);
router.get("/ml-feedback", controller.getMlFeedback);
router.patch("/ml-feedback/:id/review", controller.markMlFeedbackReviewed);
router.patch("/ml-feedback/bulk-review", controller.bulkReviewMlFeedback);
router.get("/ml-feedback/stats", controller.getMlFeedbackStats);
router.get("/ml-feedback/export", controller.exportMlFeedbackCsv);

// New Notification and Doctor Approval Routes
router.get("/notifications", controller.getNotifications);
router.patch("/notifications/:id/read", controller.markNotificationRead);
router.post("/doctor/approve", controller.approveDoctor);
router.post("/doctor/reject", controller.rejectDoctor);

module.exports = router;
