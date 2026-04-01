const mongoose = require("mongoose");

const importHistorySchema = new mongoose.Schema(
  {
    importTime: { type: Date, default: Date.now },
    codeSystem: { type: String, required: true },
    fileName: { type: String, required: true },
    fileContentType: { type: String, default: "text/csv" },
    fileContent: { type: Buffer, default: Buffer.alloc(0) },
    rowCount: { type: Number, default: 0 },
    status: { type: String, enum: ["SUCCESS", "FAILED"], required: true },
    reportDescription: { type: String, default: "" },
    importedBy: { type: String, default: "unknown" },
    errorMessage: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  { collection: "import_history" }
);

importHistorySchema.index({ importTime: -1 });

module.exports = mongoose.model("ImportHistory", importHistorySchema);
