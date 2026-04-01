import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { getPasswordStrength } from "../utils/passwordStrength";
import { forgotPasswordUpdate } from "../services/authService";
import AuthSplitLayout from "../components/AuthSplitLayout";
import "./Login.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) return setError("Email is required");
    if (!EMAIL_REGEX.test(email.trim())) return setError("Enter a valid email address");
    if (!password || !confirmPassword) return setError("Both password fields are required");
    if (strength < 5) return setError("Use 8+ chars with uppercase, lowercase, number & symbol");
    if (password !== confirmPassword) return setError("Passwords do not match");

    try {
      await forgotPasswordUpdate(email.trim(), password);
      setSuccess("Password updated! Redirecting to login…");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.response?.data || "Failed to update password");
    }
  };

  return (
    <AuthSplitLayout>
      <div className="login-card auth-card">
        <div className="auth-head">
          <h1 className="title">Forgot Password</h1>
          <p className="subtitle">Set a new password for your account</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label" htmlFor="fp-email">Email</label>
            <input
              id="fp-email"
              type="email"
              className="form-control"
              placeholder="name@hospital.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="fp-password">New Password</label>
            <div className="password-field">
              <input
                id="fp-password"
                type={showPassword ? "text" : "password"}
                className="form-control with-icon"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? "Hide" : "Show"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {password && (
              <>
                <div className="progress mt-1" style={{ height: "4px" }}>
                  <div
                    className={`progress-bar ${
                      strength <= 2 ? "bg-danger" : strength <= 4 ? "bg-warning" : "bg-success"
                    }`}
                    style={{ width: `${(strength / 5) * 100}%` }}
                  />
                </div>
                <div className="hint mt-1">
                  {strength < 5 ? "Use uppercase, lowercase, number & symbol" : "✓ Strong password"}
                </div>
              </>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="fp-confirm">Confirm Password</label>
            <div className="password-field">
              <input
                id="fp-confirm"
                type={showConfirm ? "text" : "password"}
                className="form-control with-icon"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirm((p) => !p)}
                aria-label={showConfirm ? "Hide" : "Show"}
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {success && <div className="alert alert-success mb-3">{success}</div>}
          {error   && <div className="alert alert-danger  mb-3">{error}</div>}

          <button type="submit" className="login-btn w-100 mb-3">
            Update Password
          </button>

          <div className="auth-switch">
            <button type="button" className="register-link" onClick={() => navigate("/login")}>
              ← Back to Login
            </button>
          </div>
        </form>
      </div>
    </AuthSplitLayout>
  );
}
