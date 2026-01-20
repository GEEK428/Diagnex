import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { getPasswordStrength } from "../utils/passwordStrength";

import "bootstrap/dist/css/bootstrap.min.css";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  /* 🌙 Dark mode (persistent) */
  const [dark, setDark] = useState(
    localStorage.getItem("theme") === "dark"
  );

  /* 🔐 Form state */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  /* 🔒 Password strength */
  const strength = getPasswordStrength(password);

  useEffect(() => {
    document.body.classList.toggle("dark-mode", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const validate = () => {
    const errs = {};

    if (!email) {
      errs.email = "Email is required";
    } else if (
      !/^[a-zA-Z0-9._%+-]+@(gmail\.com|[a-zA-Z0-9.-]+\.(ac\.in|edu|org|gov|in))$/.test(
        email
      )
    ) {
      errs.email =
        "Enter a valid Gmail or institutional email";
    }

    if (!password) {
      errs.password = "Password is required";
    } else if (
      !/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(
        password
      )
    ) {
      errs.password =
        "Min 8 chars with upper, lower, number & symbol";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // 🔐 mock auth
    localStorage.setItem("jwt", "mock-token");
    navigate("/app");
  };

  return (
    <>
      {/* 🌙 Dark mode toggle */}
      <div
        className="theme-toggle"
        onClick={() => setDark(!dark)}
      >
        {dark ? "☀️" : "🌙"}
      </div>

      <div className="login-wrapper">
        <div className="login-card">
          <div className="text-center mb-3">
            <div className="auth-logo">⚕️</div>
            <h5 className="title">
              NAMASTE Terminology
            </h5>
            <p className="subtitle">
              Secure access for clinicians and admins
            </p>
          </div>

          <form onSubmit={handleLogin} noValidate>
            {/* Email */}
            <div className="mb-3">
              <label className="form-label">
                Email
              </label>
              <input
                type="email"
                className={`form-control ${
                  errors.email ? "is-invalid" : ""
                }`}
                placeholder="user@gmail.com or user@hospital.ac.in"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
              />
              <div className="hint">
                Gmail or institutional email
              </div>
              {errors.email && (
                <div className="invalid-feedback">
                  {errors.email}
                </div>
              )}
            </div>

            {/* Password */}
            <div className="mb-3">
              <label className="form-label">
                Password
              </label>

              <div className="position-relative">
                <input
                  type={
                    showPassword ? "text" : "password"
                  }
                  className={`form-control ${
                    errors.password ? "is-invalid" : ""
                  }`}
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                />

                <span
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? (
                    <FaEyeSlash />
                  ) : (
                    <FaEye />
                  )}
                </span>

                {errors.password && (
                  <div className="invalid-feedback d-block">
                    {errors.password}
                  </div>
                )}
              </div>

              {/* Password strength */}
              {password && (
                <>
                  <div
                    className="progress mt-2"
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

                  <div className="hint mt-1">
                    {strength <= 2 &&
                      "Weak password"}
                    {strength === 3 &&
                      "Moderate password"}
                    {strength >= 4 &&
                      "Strong password"}
                  </div>
                </>
              )}
            </div>

            {/* Remember + Forgot */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="remember"
                />
                <label
                  className="form-check-label"
                  htmlFor="remember"
                >
                  Remember me
                </label>
              </div>

              <span
                className="forgot"
                onClick={() =>
                  navigate("/forgot-password")
                }
              >
                Forgot password?
              </span>
            </div>

            {/* Login */}
            <button
              type="submit"
              className="btn login-btn w-100"
            >
              Login
            </button>

            {/* Register */}
            <div className="text-center mt-3 small">
              Not registered yet?{" "}
              <span
                className="register-link"
                onClick={() =>
                  navigate("/register")
                }
              >
                Register here
              </span>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
