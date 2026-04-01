const { verifyJwt } = require("../utils/jwt");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  let token = header.startsWith("Bearer ") ? header.slice(7) : null;
  
  // Also check query param specifically for file exports/downloads in new tabs
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).send("Unauthorized");

  try {
    const decoded = verifyJwt(token);
    const query = decoded.userId
      ? { _id: decoded.userId, email: decoded.email?.toLowerCase() }
      : { email: decoded.email?.toLowerCase() };
    const user = await User.findOne(query).lean();
    if (!user || !user.enabled) {
      return res.status(401).send("Unauthorized");
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).send("Invalid token: " + error.message);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
}

async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  let token = header.startsWith("Bearer ") ? header.slice(7) : null;
  
  if (!token && req.query.token) {
    token = req.query.token;
  }
  
  if (!token) return next();

  try {
    const decoded = verifyJwt(token);
    const query = decoded.userId
      ? { _id: decoded.userId, email: decoded.email?.toLowerCase() }
      : { email: decoded.email?.toLowerCase() };
    const user = await User.findOne(query).lean();
    if (user && user.enabled) {
      req.user = user;
    }
  } catch (err) {
    // Silently ignore invalid tokens in optional auth
  }
  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
