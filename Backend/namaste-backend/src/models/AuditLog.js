const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    userId: { type: String, default: null },
    endpoint: { type: String, required: true },
    details: { type: String, default: "" },
    patientId: { type: String, default: null },
    timestamp: { type: Date, default: Date.now }
  },
  { collection: "audit_logs" }
);

auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
