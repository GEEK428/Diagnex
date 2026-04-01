const mongoose = require("mongoose");

const conceptRequestSchema = new mongoose.Schema(
  {
    term: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    suggestedCode: { type: String, required: true, trim: true },
    suggestedSystem: { type: String, required: true, trim: true },
    reason: { type: String, default: "", trim: true },
    requestedBy: { type: String, default: "anonymous" },
    status: { type: String, default: "PENDING", enum: ["PENDING", "APPROVED", "REJECTED"] },
    rejectionReason: { type: String, default: "" },
    finalCode: { type: String, default: "" },
    processedBy: { type: String, default: null },
    processedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
  },
  { collection: "concept_requests" }
);

conceptRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ConceptRequest", conceptRequestSchema);
