const AuditLog = require("../models/AuditLog");

async function logAction({ userId = null, patientId = null, action, endpoint, details = "" }) {
  await AuditLog.create({ userId, patientId, action, endpoint, details, timestamp: new Date() });
}

module.exports = { logAction };
