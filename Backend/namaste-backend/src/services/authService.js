const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const User = require("../models/User");
const ResetToken = require("../models/ResetToken");
const AuditLog = require("../models/AuditLog");
const ConceptRequest = require("../models/ConceptRequest");
const MlFeedback = require("../models/MlFeedback");
const ImportHistory = require("../models/ImportHistory");
const prisma = require("../config/prisma");
const { signJwt } = require("../utils/jwt");
const { isStrongPassword } = require("../utils/password");
const env = require("../config/env");
const { sendResetPasswordEmail } = require("./emailService");
const Notification = require("../models/Notification");

function escapeRegex(string) {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
}
function resolveRole(roleValue) {
  const normalized = (roleValue || "USER").trim().toUpperCase();
  if (normalized === "ADMIN") return "ADMIN";
  if (normalized === "DOCTOR" || normalized === "USER") return "USER";
  throw new Error(`Unsupported role: ${roleValue}`);
}

function generateStrongPassword() {
  const raw = crypto.randomBytes(12).toString("base64").replace(/[^a-zA-Z0-9]/g, "A");
  return `Gs@${raw.slice(0, 8)}1a`;
}

function createGoogleSetupToken(payload) {
  return jwt.sign({ ...payload, purpose: "google_setup" }, env.jwtSecret, { expiresIn: "15m" });
}

function decodeGoogleSetupToken(setupToken) {
  if (!setupToken) throw new Error("Google setup token is required");

  let decoded;
  try {
    decoded = jwt.verify(setupToken, env.jwtSecret);
  } catch (error) {
    throw new Error("Google setup session expired. Please continue with Google again.");
  }

  if (decoded?.purpose !== "google_setup") {
    throw new Error("Invalid Google setup session");
  }

  return decoded;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function registerUser(payload) {
  const email = payload.email.toLowerCase();
  const existsEmail = await User.findOne({ email });
  if (existsEmail) throw new Error("This email is already registered. Please login instead.");

  if (payload.licenseNumber) {
    const existsLicense = await User.findOne({ licenseNumber: String(payload.licenseNumber).trim() });
    if (existsLicense) throw new Error("A user with this medical license number is already registered.");
  }

  if (!isStrongPassword(payload.password)) {
    throw new Error(
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
    );
  }

  const resolvedRole = resolveRole(payload.role);

  // For doctors — validate that the provided adminEmail belongs to a real ADMIN
  let adminEmail = null;
  if (resolvedRole === "USER") {
    if (!payload.adminEmail || !payload.adminEmail.trim()) {
      throw new Error("Doctor accounts must provide the email of a registered admin to connect with.");
    }
    const adminUser = await User.findOne({ email: payload.adminEmail.trim().toLowerCase(), role: "ADMIN" });
    if (!adminUser) {
      throw new Error("No registered admin found with that email. Please check with your administrator.");
    }
    
    // Hospital Match Verification (Case-Insensitive)
    const adminHospital = String(adminUser.hospital || "").trim().toLowerCase();
    const doctorHospital = String(payload.hospital || "").trim().toLowerCase();
    
    if (adminHospital !== doctorHospital) {
      throw new Error(`The admin with email ${adminUser.email} is associated with ${adminUser.hospital || 'another hospital'}. Not your hospital admin.`);
    }

    adminEmail = adminUser.email;
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);

  const registrationStatus = resolvedRole === "USER" ? "PENDING" : "APPROVED";

  try {
    const user = await User.create({
      name: payload.name,
      email,
      password: passwordHash,
      role: resolvedRole,
      enabled: registrationStatus === "APPROVED",
      gender: payload.gender,
      hospital: payload.hospital,
      address: payload.address,
      licenseNumber: payload.licenseNumber,
      adminEmail,
      registrationStatus
    });

    if (registrationStatus === "PENDING" && adminEmail) {
      await Notification.create({
        recipientEmail: adminEmail,
        title: "New Doctor Registration Request",
        message: `${payload.name} (${email}) has requested to register under your administration in ${payload.hospital}.`,
        type: "DOCTOR_REGISTRATION",
        metadata: {
          doctorId: user._id.toString(),
          doctorEmail: email,
          doctorNameString: payload.name,
          hospital: payload.hospital
        }
      });
    }
  } catch (error) {
    if (error?.code === 11000) {
      const key = Object.keys(error.keyPattern || {})[0];
      if (key === "licenseNumber") throw new Error("This medical license number is already in use.");
      throw new Error("This email is already registered. Please login instead.");
    }
    throw error;
  }

  return resolvedRole === "USER" 
    ? "Registration submitted. Please wait for administrator approval." 
    : "User registered successfully!";
}

async function loginUser(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.password) throw new Error("Invalid email or password");

  // Approval Check
  if (user.role === "USER") {
    if (user.registrationStatus === "PENDING") {
      throw new Error("Your account is awaiting admin approval. Please check back later.");
    }
    if (user.registrationStatus === "REJECTED") {
      throw new Error(`Your registration was rejected by the administrator${user.rejectionReason ? ': ' + user.rejectionReason : '.'}`);
    }
  }

  if (!user.enabled) throw new Error("This account has been disabled. Please contact support.");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error("Invalid email or password");

  return signJwt({ email: user.email, role: user.role, userId: user._id.toString() });
}

async function verifyGoogleIdToken(idToken) {
  const response = await axios.get("https://oauth2.googleapis.com/tokeninfo", {
    params: { id_token: idToken },
    timeout: 5000
  });

  const tokenInfo = response.data || {};
  const email = tokenInfo.email;
  const audience = tokenInfo.aud;
  const emailVerified = String(tokenInfo.email_verified || "false").toLowerCase() === "true";
  const expEpochSeconds = Number(tokenInfo.exp || 0);
  const nowEpochSeconds = Math.floor(Date.now() / 1000);

  if (!email) throw new Error("Google token does not contain email");
  if (!emailVerified) throw new Error("Google email is not verified");
  if (env.googleClientId && audience !== env.googleClientId) {
    throw new Error("Google token audience mismatch");
  }
  if (expEpochSeconds <= nowEpochSeconds) throw new Error("Google token has expired");

  const fallbackName = String(email).split("@")[0];

  return {
    email: email.toLowerCase(),
    name: String(tokenInfo.name || fallbackName).trim() || fallbackName
  };
}

async function loginWithGoogleIdToken(idToken) {
  if (!idToken) throw new Error("Google ID token is required");

  const profile = await verifyGoogleIdToken(idToken);
  const user = await User.findOne({ email: profile.email });

  if (user) {
    if (user.oauthProvider && user.oauthProvider !== "google") {
      throw new Error("This email is linked to another sign-in method.");
    }

    if (user.oauthProvider !== "google") {
      throw new Error("This email is already registered with password login.");
    }

    // Approval Check for Google Login
    if (user.role === "USER") {
      if (user.registrationStatus === "PENDING") {
        throw new Error("Your account is awaiting admin approval. Please check back later.");
      }
      if (user.registrationStatus === "REJECTED") {
        throw new Error(`Your registration was rejected by the administrator${user.rejectionReason ? ': ' + user.rejectionReason : '.'}`);
      }
    }
    if (!user.enabled) throw new Error("This account has been disabled. Please contact support.");

    const token = signJwt({ email: user.email, role: user.role, userId: user._id.toString() });
    return { registrationRequired: false, token };
  }

  const password = generateStrongPassword();
  const setupToken = createGoogleSetupToken({
    email: profile.email,
    name: profile.name,
    password
  });

  return {
    registrationRequired: true,
    setupToken,
    prefill: {
      name: profile.name,
      email: profile.email,
      password
    }
  };
}

async function completeGoogleRegistration(payload) {
  const decoded = decodeGoogleSetupToken(payload.setupToken);
  const email = String(decoded.email || "").toLowerCase();
  const tokenName = String(decoded.name || "").trim();
  const generatedPassword = String(decoded.password || "");

  if (!email || !tokenName || !generatedPassword) {
    throw new Error("Invalid Google setup session");
  }

  const name = String(payload.name || tokenName).trim();
  console.log(`[Google Registration] Finishing for ${email}. Using Name: "${name}" (Token Name: "${tokenName}")`);
  if (!name) throw new Error("Full name is required.");

  const exists = await User.findOne({ email });
  if (exists && exists.oauthProvider === "google") {
    const token = signJwt({ email: exists.email, role: exists.role, userId: exists._id.toString() });
    return { token, registered: false, message: "Google login successful" };
  }
  if (exists) throw new Error("This email is already registered. Please login instead.");

  if (payload.licenseNumber) {
    const existsLicense = await User.findOne({ licenseNumber: String(payload.licenseNumber).trim() });
    if (existsLicense) throw new Error("A user with this medical license number is already registered.");
  }

  const resolvedRole = resolveRole(payload.role);
  const registrationStatus = resolvedRole === "USER" ? "PENDING" : "APPROVED";

  // For doctors — validate adminEmail
  let adminEmail = null;
  if (resolvedRole === "USER") {
    if (!payload.adminEmail || !payload.adminEmail.trim()) {
      throw new Error("Doctor accounts must provide the email of a registered admin to connect with.");
    }
    const adminUser = await User.findOne({ email: payload.adminEmail.trim().toLowerCase(), role: "ADMIN" });
    if (!adminUser) {
      throw new Error("No registered admin found with that email. Please check with your administrator.");
    }
    
    // Hospital Match Verification (Case-Insensitive)
    const adminHospital = String(adminUser.hospital || "").trim().toLowerCase();
    const doctorHospital = String(payload.hospital || "").trim().toLowerCase();
    
    if (adminHospital !== doctorHospital) {
      throw new Error(`The admin with email ${adminUser.email} is associated with ${adminUser.hospital || 'another hospital'}. Not your hospital admin.`);
    }

    adminEmail = adminUser.email;
  }

  const passwordHash = await bcrypt.hash(generatedPassword, 10);
  let created;

  try {
    created = await User.create({
      name,
      email,
      password: passwordHash,
      role: resolvedRole,
      enabled: registrationStatus === "APPROVED",
      gender: payload.gender,
      hospital: payload.hospital,
      address: payload.address,
      licenseNumber: payload.licenseNumber,
      adminEmail,
      registrationStatus,
      oauthProvider: "google"
    });

    if (registrationStatus === "PENDING" && adminEmail) {
      await Notification.create({
        recipientEmail: adminEmail,
        title: "New Doctor Registration Request (Google)",
        message: `${name} (${email}) has requested to register under your administration using Google OAuth.`,
        type: "DOCTOR_REGISTRATION",
        metadata: {
          doctorId: created._id.toString(),
          doctorEmail: email,
          doctorNameString: name,
          hospital: payload.hospital
        }
      });
    }
  } catch (error) {
    if (error?.code === 11000) {
      const key = Object.keys(error.keyPattern || {})[0];
      if (key === "licenseNumber") throw new Error("This medical license number is already in use.");
      throw new Error("This email is already registered. Please login instead.");
    }
    throw error;
  }

  if (created.registrationStatus === "PENDING") {
    return { 
      token: null, 
      registered: true, 
      message: "Registration submitted. Please wait for administrator approval." 
    };
  }

  const token = signJwt({ email: created.email, role: created.role, userId: created._id.toString() });
  return { token, registered: true, message: "Registration completed" };
}

async function createPasswordResetToken(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new Error("User not found");
  if (user.oauthProvider === "google") {
    throw new Error("Forgot password is not available for Google login accounts.");
  }

  await ResetToken.deleteMany({ userId: user._id });

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await ResetToken.create({ token, userId: user._id, expiresAt });
  await sendResetPasswordEmail(user.email, token);

  return token;
}

async function resetPasswordByEmail(email, newPassword) {
  if (!isStrongPassword(newPassword)) {
    throw new Error(
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
    );
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new Error("User not found");
  if (user.oauthProvider === "google") {
    throw new Error("Forgot password is not available for Google login accounts.");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  await ResetToken.deleteMany({ userId: user._id });

  return "Password reset successful!";
}

async function resetPassword(token, newPassword) {
  if (!isStrongPassword(newPassword)) {
    throw new Error(
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
    );
  }

  const resetToken = await ResetToken.findOne({ token });
  if (!resetToken) throw new Error("Invalid reset token");
  if (resetToken.expiresAt < new Date()) throw new Error("Token expired!");

  const user = await User.findById(resetToken.userId);
  if (!user) throw new Error("User not found");
  if (user.oauthProvider === "google") {
    throw new Error("Forgot password is not available for Google login accounts.");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  await ResetToken.deleteOne({ _id: resetToken._id });

  return "Password reset successful!";
}

async function getCurrentUserByEmail(email) {
  const user = await User.findOne({ email: email.toLowerCase() }).lean();
  if (!user) throw new Error("User not found");
  delete user.password;
  return user;
}

async function updateProfile(email, payload) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new Error("User not found");

  if (payload.name !== undefined) user.name = payload.name;
  if (payload.address !== undefined) user.address = payload.address;
  if (payload.licenseNumber !== undefined) user.licenseNumber = payload.licenseNumber;
  if (payload.gender !== undefined) user.gender = payload.gender;
  if (payload.phone !== undefined) user.phone = payload.phone;
  if (payload.hospital !== undefined) user.hospital = payload.hospital;
  if (payload.email !== undefined && payload.email.toLowerCase() !== user.email) {
    if (user.oauthProvider === "google") {
      throw new Error("Cannot change email associated with a Google login.");
    }
    user.email = payload.email.toLowerCase();
  }

  try {
    await user.save();
  } catch (error) {
    if (error?.code === 11000) {
      const key = Object.keys(error.keyPattern || {})[0];
      if (key === "licenseNumber") throw new Error("This medical license number is already in use.");
      throw new Error("This email is already registered by another account.");
    }
    throw error;
  }
  const updated = user.toObject();
  delete updated.password;
  return updated;
}

async function changePassword(email, currentPassword, newPassword) {
  if (!isStrongPassword(newPassword)) {
    throw new Error(
      "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
    );
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new Error("User not found");

  if (user.password) {
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) throw new Error("Current password is incorrect");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return "Password changed successfully!";
}

async function deleteAccountByEmail(email, password) {
  const user = await User.findOne({ email: String(email || "").toLowerCase() });
  if (!user || user.email.startsWith("DELETED_")) throw new Error("User not found or already deleted.");

  if (user.oauthProvider !== "google") {
    if (!password) throw new Error("Password is required to deactivate this account.");
    const matches = await bcrypt.compare(password, user.password || "");
    if (!matches) throw new Error("Incorrect password.");
  }

  const userId = user._id.toString();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const deletedPrefix = `DELETED_${timestamp}_`;
  const originalEmail = user.email;
  const anonymizedEmail = `${deletedPrefix}${originalEmail}`;

  // Use a transaction for MongoDB soft-deletion
  const session = await User.startSession();
  try {
    await session.withTransaction(async () => {
      // 1. Anonymize History & Requests so they 'disappear' for a re-registered user
      await ConceptRequest.updateMany(
        { requestedBy: { $regex: new RegExp(`^${escapeRegex(originalEmail)}$`, "i") } },
        { requestedBy: anonymizedEmail },
        { session }
      );
      
      await ImportHistory.updateMany(
        { importedBy: { $regex: new RegExp(`^${escapeRegex(originalEmail)}$`, "i") } },
        { importedBy: anonymizedEmail },
        { session }
      );

      // 2. Clear PII from Audit & Feedback but keep the records
      await MlFeedback.updateMany(
        { $or: [{ userId }, { userId: originalEmail }] },
        { $set: { userId: null } },
        { session }
      );

      await AuditLog.updateMany(
        { $or: [{ userId }, { userId: originalEmail }] },
        { $set: { userId: null } },
        { session }
      );

      // 3. Mark User as deleted and free up the email/license for re-registration
      await User.updateOne(
        { _id: user._id },
        { 
          enabled: false,
          email: anonymizedEmail,
          licenseNumber: user.licenseNumber ? `${deletedPrefix}${user.licenseNumber}` : null
        },
        { session }
      );
    });
  } finally {
    session.endSession();
  }

  // 4. Update Postgres records (Anonymize but preserve the entries)
  const pgDeletionLabel = `DELETED_${originalEmail}`;
  await Promise.all([
    prisma.$executeRaw`UPDATE "mappings" SET "created_by" = ${pgDeletionLabel} WHERE "created_by" = ${originalEmail}`,
    prisma.$executeRaw`UPDATE "mappings" SET "verified_by" = ${pgDeletionLabel} WHERE "verified_by" = ${originalEmail}`,
    prisma.$executeRaw`UPDATE "code_systems" SET "created_by" = ${pgDeletionLabel} WHERE "created_by" = ${originalEmail}`,
    prisma.systemVersion.updateMany({
      where: { importedBy: originalEmail },
      data: { importedBy: pgDeletionLabel }
    })
  ]);

  return "Account successfully deactivated and scrubbed.";
}

module.exports = {
  registerUser,
  loginUser,
  loginWithGoogleIdToken,
  completeGoogleRegistration,
  createPasswordResetToken,
  resetPasswordByEmail,
  resetPassword,
  getCurrentUserByEmail,
  updateProfile,
  changePassword,
  deleteAccountByEmail
};
