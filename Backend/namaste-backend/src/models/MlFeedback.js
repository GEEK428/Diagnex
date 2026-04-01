const mongoose = require("mongoose");

const mlFeedbackSchema = new mongoose.Schema(
  {
    query: { type: String, required: true },
    predictedCode: { type: String, default: null },
    predictedSystem: { type: String, default: "NAMASTE" },
    correctCode: { type: String, default: "" }, 
    correctSystem: { type: String, default: "" },
    feedbackType: { 
      type: String, 
      enum: ["confirmed", "corrected"], 
      default: "confirmed" 
    },
    confidence: { type: Number, default: null },
    userId: { type: String, default: null },
    
    // Admin Review Cycle
    reviewed: { type: Boolean, default: false },
    adminDecision: { 
      type: String, 
      enum: ["PENDING", "ACCEPTED", "IGNORED"], 
      default: "PENDING" 
    },
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    
    // For RETRAINING Export
    exportStatus: { 
      type: String, 
      enum: ["DRAFT", "EXPORTED"], 
      default: "DRAFT" 
    },
    createdAt: { type: Date, default: Date.now }
  },
  { collection: "ml_feedback" }
);

module.exports = mongoose.model("MlFeedback", mlFeedbackSchema);
