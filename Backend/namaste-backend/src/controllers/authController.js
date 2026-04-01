const authService = require("../services/authService");
const { signJwt } = require("../utils/jwt");

async function register(req, res) {
  try {
    const result = await authService.registerUser(req.body);
    return res.json(result);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function login(req, res) {
  try {
    const token = await authService.loginUser(req.body.email, req.body.password);
    return res.json({ token });
  } catch (error) {
    return res.status(401).send(error.message);
  }
}

async function googleLogin(req, res) {
  try {
    const result = await authService.loginWithGoogleIdToken(req.body.idToken);
    return res.json(result);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function googleCompleteRegistration(req, res) {
  try {
    const result = await authService.completeGoogleRegistration(req.body);
    return res.json(result);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function forgotPassword(req, res) {
  try {
    await authService.createPasswordResetToken(req.body.email);
    return res.json("Reset link sent successfully!");
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function forgotPasswordUpdate(req, res) {
  try {
    const result = await authService.resetPasswordByEmail(req.body.email, req.body.password);
    return res.json(result);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function resetPassword(req, res) {
  try {
    const result = await authService.resetPassword(req.body.token, req.body.password);
    return res.json(result);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function me(req, res) {
  try {
    const user = await authService.getCurrentUserByEmail(req.user.email);
    return res.json(user);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function updateProfile(req, res) {
  try {
    const updated = await authService.updateProfile(req.user.email, req.body);
    return res.json(updated);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function changePassword(req, res) {
  try {
    const result = await authService.changePassword(
      req.user.email,
      req.body.currentPassword,
      req.body.newPassword
    );
    return res.json(result);
  } catch (error) {
    return res.status(400).send(error.message);
  }
}

async function deleteAccount(req, res) {
  try {
    const result = await authService.deleteAccountByEmail(req.user.email, req.body.password);
    return res.json(result);
  } catch (error) {
    console.error(`[Delete Account Cache Error]: ${error.message}`);
    return res.status(400).send(error.message);
  }
}

function googleCallback(req, res) {
  const token = signJwt({
    email: req.user.email,
    role: req.user.role,
    userId: req.user._id.toString()
  });

  const origin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
  return res.redirect(`${origin}/login?token=${token}`);
}

module.exports = {
  register,
  login,
  googleLogin,
  googleCompleteRegistration,
  forgotPassword,
  forgotPasswordUpdate,
  resetPassword,
  me,
  updateProfile,
  changePassword,
  deleteAccount,
  googleCallback
};
