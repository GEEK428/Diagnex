const { z } = require("zod");

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "DOCTOR", "USER"]).optional(),
  gender: z.string().optional(),
  hospital: z.string().optional(),
  address: z.string().optional(),
  licenseNumber: z.string().optional(),
  adminEmail: z.string().email().optional()
});

const googleCompleteSchema = z.object({
  setupToken: z.string().min(1),
  role: z.enum(["ADMIN", "DOCTOR", "USER"]).optional(),
  gender: z.string().optional(),
  hospital: z.string().optional(),
  address: z.string().optional(),
  licenseNumber: z.string().optional(),
  adminEmail: z.string().email().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const emailSchema = z.object({ email: z.string().email() });

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8)
});

const forgotUpdateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

const deleteAccountSchema = z.object({
  password: z.string().min(1).optional()
});

const profileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  hospital: z.string().optional(),
  licenseNumber: z.string().optional()
});

module.exports = {
  registerSchema,
  googleCompleteSchema,
  loginSchema,
  emailSchema,
  resetSchema,
  forgotUpdateSchema,
  changePasswordSchema,
  deleteAccountSchema,
  profileSchema
};
