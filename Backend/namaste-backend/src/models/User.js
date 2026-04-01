const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, default: null },
    role: { type: String, enum: ["ADMIN", "USER"], default: "USER" },
    enabled: { type: Boolean, default: true },
    gender: String,
    hospital: String,
    address: String,
    phone: String,
    licenseNumber: { type: String, unique: true, sparse: true, trim: true },
    adminEmail: { type: String, default: null }, // For DOCTOR role — linked admin
    registrationStatus: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "APPROVED" },
    rejectionReason: String,
    oauthProvider: String
  },
  { timestamps: true, collection: "users" }
);

module.exports = mongoose.model("User", userSchema);
