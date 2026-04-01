const express = require("express");
const passport = require("passport");
const validate = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const env = require("../config/env");
const controller = require("../controllers/authController");
const {
  registerSchema,
  googleCompleteSchema,
  loginSchema,
  emailSchema,
  resetSchema,
  forgotUpdateSchema,
  changePasswordSchema,
  deleteAccountSchema,
  profileSchema
} = require("../validators/authValidators");

const router = express.Router();

router.post("/register", authLimiter, validate(registerSchema), controller.register);
router.post(
  "/register/google-complete",
  authLimiter,
  validate(googleCompleteSchema),
  controller.googleCompleteRegistration
);
router.post("/login", authLimiter, validate(loginSchema), controller.login);
router.post("/google", authLimiter, controller.googleLogin);
router.post("/forgot-password", authLimiter, validate(emailSchema), controller.forgotPassword);
router.post(
  "/forgot-password/update",
  authLimiter,
  validate(forgotUpdateSchema),
  controller.forgotPasswordUpdate
);
router.post("/reset-password", authLimiter, validate(resetSchema), controller.resetPassword);

if (env.googleClientId && env.googleClientSecret) {
  router.get("/google/oauth", passport.authenticate("google", { scope: ["profile", "email"] }));
  router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/login", session: true }),
    controller.googleCallback
  );
} else {
  router.get("/google/oauth", (req, res) => res.status(400).send("Google OAuth is not configured"));
  router.get("/google/callback", (req, res) =>
    res.status(400).send("Google OAuth is not configured")
  );
}

router.get("/me", requireAuth, controller.me);
router.put("/me", requireAuth, validate(profileSchema), controller.updateProfile);
router.post("/change-password", requireAuth, validate(changePasswordSchema), controller.changePassword);
router.post("/delete-account", requireAuth, validate(deleteAccountSchema), controller.deleteAccount);

module.exports = router;
