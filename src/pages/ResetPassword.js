import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { getPasswordStrength } from "../utils/passwordStrength";
import "./Login.css";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = getPasswordStrength(password);

  const reset = (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirm) {
      setError("All fields are required");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (strength < 4) {
      setError("Password is too weak");
      return;
    }

    // mock success → redirect to login
    navigate("/");
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h5 className="title text-center mb-3">
          Reset Password
        </h5>

        <form onSubmit={reset} noValidate>
          {/* New Password */}
          <div className="mb-3">
            <label className="form-label">
              New Password
            </label>

            <div className="position-relative">
              <input
                type={showNew ? "text" : "password"}
                className="form-control"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
              />

              <span
                className="password-toggle"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          {/* Password strength */}
          {password && (
            <>
              <div
                className="progress mb-1"
                style={{ height: "5px" }}
              >
                <div
                  className={`progress-bar ${
                    strength <= 2
                      ? "bg-danger"
                      : strength === 3
                      ? "bg-warning"
                      : "bg-success"
                  }`}
                  style={{
                    width: `${(strength / 5) * 100}%`,
                  }}
                />
              </div>

              <div className="hint mb-2">
                {strength <= 2 && "Weak password"}
                {strength === 3 &&
                  "Moderate password"}
                {strength >= 4 &&
                  "Strong password"}
              </div>
            </>
          )}

          {/* Confirm Password */}
          <div className="mb-3">
            <label className="form-label">
              Confirm Password
            </label>

            <div className="position-relative">
              <input
                type={
                  showConfirm ? "text" : "password"
                }
                className="form-control"
                value={confirm}
                onChange={(e) =>
                  setConfirm(e.target.value)
                }
              />

              <span
                className="password-toggle"
                onClick={() =>
                  setShowConfirm(!showConfirm)
                }
              >
                {showConfirm ? (
                  <FaEyeSlash />
                ) : (
                  <FaEye />
                )}
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-danger small mb-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn login-btn w-100"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
