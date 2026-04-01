const logger = require("../config/logger");

function notFoundHandler(req, res) {
  res.status(404).json({ message: "Route not found" });
}

function errorHandler(err, req, res, next) {
  logger.error(err.message, { stack: err.stack, path: req.path });
  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || "Internal server error" });
}

module.exports = { notFoundHandler, errorHandler };
