const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientEmail: { type: String, required: true, lowercase: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["DOCTOR_REGISTRATION", "SYSTEM_ALERT"], default: "SYSTEM_ALERT" },
    status: { type: String, enum: ["UNREAD", "READ", "ARCHIVED"], default: "UNREAD" },
    metadata: {
      doctorId: String,
      doctorEmail: String,
      doctorNameString: String,
      hospital: String
    }
  },
  { timestamps: true, collection: "notifications" }
);

module.exports = mongoose.model("Notification", notificationSchema);
