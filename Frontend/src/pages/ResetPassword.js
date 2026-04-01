import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { getPasswordStrength } from "../utils/passwordStrength";
import { resetPassword } from "../services/authService";
import AuthSplitLayout from "../components/AuthSplitLayout";
import "./Login.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password || !confirm) return setError("All fields are required");
    if (password !== confirm) return setError("Passwords do not match");
    if (strength < 5) return setError("Use uppercase, lowercase, number & symbol (8+ chars)");

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) return setError("Invalid or missing reset token");

    try {
      await resetPassword(token, password);
      setSuccess("Password reset successful! Redirecting…");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data || "Failed to reset password");
    }
  };

  return (
    <AuthSplitLayout>
      <div className="login-card auth-card">
        <div className="auth-head">
          <h1 className="title">Reset Password</h1>
          <p className="subtitle">Choose a new strong password</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label className="form-label" htmlFor="rp-new">New Password</label>
            <div className="password-field">
              <input
                id="rp-new"
                type={showNew ? "text" : "password"}
                className="form-control with-icon"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowNew((p) => !p)}
                aria-label={showNew ? "Hide" : "Show"}
              >
                {showNew ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {password && (
              <>
                <div className="progress mt-1" style={{ height: "4px" }}>
                  <div
                    className={`progress-bar ${
                      strength <= 2 ? "bg-danger" : strength < 5 ? "bg-warning" : "bg-success"
                    }`}
                    style={{ width: `${(strength / 5) * 100}%` }}
                  />
                </div>
                <div className="hint mt-1">
                  {strength <= 2 && "Weak — add more variety"}
                  {strength > 2 && strength < 5 && "Almost there — add the missing requirement"}
                  {strength >= 5 && "✓ Strong password"}
                </div>
              </>
            )}
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="rp-confirm">Confirm Password</label>
            <div className="password-field">
              <input
                id="rp-confirm"
                type={showConfirm ? "text" : "password"}
                className="form-control with-icon"
                placeholder="Repeat your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
            Reset Password
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
