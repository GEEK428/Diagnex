import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Mail, Lock } from "lucide-react";
import { login, loginWithGoogle } from "../services/authService";
import { GoogleLogin } from "@react-oauth/google";
import AuthSplitLayout from "../components/AuthSplitLayout";
import "./Login.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validate = (nextEmail = email, nextPassword = password, nextTouched = touched, force = false) => {
    const errs = {};
    if (!nextEmail.trim()) errs.email = "Email is required";
    else if (!EMAIL_REGEX.test(nextEmail.trim())) errs.email = "Enter a valid email address";
    if (!nextPassword) errs.password = "Password is required";

    if (force) {
      setErrors(errs);
      return Object.keys(errs).length === 0;
    }

    const filtered = {};
    if (nextTouched.email && errs.email) filtered.email = errs.email;
    if (nextTouched.password && errs.password) filtered.password = errs.password;
    setErrors(filtered);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError("");
    const allTouched = { email: true, password: true };
    setTouched(allTouched);
    if (!validate(email, password, allTouched, true)) return;
    setLoading(true);
    try {
      const token = await login(email.trim(), password);
      localStorage.setItem("jwt", token);
      sessionStorage.removeItem("jwt");
      navigate("/app");
    } catch (err) {
      setLoginError(err.response?.data || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    setLoginError("");
    try {
      if (!credentialResponse?.credential) throw new Error("Missing Google credential");
      const result = await loginWithGoogle(credentialResponse.credential);

      if (result?.registrationRequired) {
        navigate("/register", {
          state: {
            googleSetup: {
              setupToken: result.setupToken,
              prefill: result.prefill
            }
          }
        });
        return;
      }

      if (!result?.token) throw new Error("Google login failed");
      localStorage.setItem("jwt", result.token);
      sessionStorage.removeItem("jwt");
      navigate("/app");
    } catch (err) {
      setLoginError(err.response?.data || "Google login failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthSplitLayout>
      <div className="login-card auth-card">
        <div className="auth-head">
          <h1 className="title">Welcome Back</h1>
          <p className="subtitle">Sign in to continue your session</p>
        </div>

        <form onSubmit={handleLogin} noValidate>
          {loginError && <div className="alert alert-danger mb-3">{loginError}</div>}

          <div className="mb-3">
            <label className="form-label" htmlFor="login-email">Email</label>
            <div className="input-icon-wrapper">
              <Mail className="input-icon" size={16} />
              <input
                id="login-email"
                type="email"
                className={`form-control with-left-icon${errors.email ? " border-danger" : ""}`}
                placeholder="name@hospital.org"
                value={email}
                onChange={(e) => {
                  const v = e.target.value;
                  const nextTouched = { ...touched, email: true };
                  setTouched(nextTouched);
                  setEmail(v);
                  validate(v, password, nextTouched);
                }}
                autoComplete="email"
              />
            </div>
            {errors.email && <div className="text-danger mt-1">{errors.email}</div>}
          </div>

          <div className="mb-3">
            <div className="password-label-row">
              <label className="form-label" htmlFor="login-password">Password</label>
              <button type="button" className="forgot" onClick={() => navigate("/forgot-password")}>
                Forgot password?
              </button>
            </div>
            <div className="password-field input-icon-wrapper">
              <Lock className="input-icon" size={16} />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className={`form-control with-left-icon with-icon${errors.password ? " border-danger" : ""}`}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  const v = e.target.value;
                  const nextTouched = { ...touched, password: true };
                  setTouched(nextTouched);
                  setPassword(v);
                  validate(email, v, nextTouched);
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.password && <div className="text-danger mt-1">{errors.password}</div>}
          </div>

          <button type="submit" className="login-btn w-100 mb-3" disabled={loading || googleLoading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>

          <div className="or-divider mb-3">OR</div>

          <div className="google-oauth-wrap mb-3">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setLoginError("Failed to authenticate with Google")}
              useOneTap
              theme="outline"
              text="signin_with"
              shape="rectangular"
              width="300"
            />
          </div>

          <div className="auth-switch">
            Not registered yet?{" "}
            <button type="button" className="register-link" onClick={() => navigate("/register")}>
              Register here
            </button>
          </div>
        </form>
      </div>
    </AuthSplitLayout>
  );
}
