const mongoose = require("mongoose");

const resetTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    expiresAt: { type: Date, required: true }
  },
  { collection: "reset_tokens" }
);

resetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ResetToken", resetTokenSchema);
