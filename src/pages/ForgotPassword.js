import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import "./Login.css";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [dark, setDark] = useState(
    localStorage.getItem("theme") === "dark"
  );

  const [method, setMethod] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.classList.toggle("dark-mode", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const sendCode = (e) => {
    e.preventDefault();
    setError("");

    if (method === "email" && !email.trim()) {
      setError("Email is required");
      return;
    }

    if (method === "phone" && (!phone || phone.length < 8)) {
      setError("Enter a valid phone number");
      return;
    }

    // mock OTP
    localStorage.setItem("otp", "123456");
    navigate("/verify-code");
  };

  return (
    <>
      {/* Dark mode toggle */}
      <div className="theme-toggle" onClick={() => setDark(!dark)}>
        {dark ? "☀️" : "🌙"}
      </div>

      <div className="login-wrapper">
        <div className="login-card">
          <h5 className="title text-center mb-1">
            Forgot Password
          </h5>
          <p className="subtitle text-center mb-3">
            Choose where to receive the verification code
          </p>

          <form onSubmit={sendCode} noValidate>
            {/* Method selection */}
            <div className="mb-3">
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="radio"
                  id="emailOpt"
                  checked={method === "email"}
                  onChange={() => setMethod("email")}
                />
                <label
                  className="form-check-label"
                  htmlFor="emailOpt"
                >
                  Send code to email
                </label>
              </div>

              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  id="phoneOpt"
                  checked={method === "phone"}
                  onChange={() => setMethod("phone")}
                />
                <label
                  className="form-check-label"
                  htmlFor="phoneOpt"
                >
                  Send code to phone
                </label>
              </div>
            </div>

            {/* Email */}
            {method === "email" && (
              <div className="mb-3">
                <label className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                />
              </div>
            )}

            {/* Phone */}
            {method === "phone" && (
              <div className="mb-3">
                <label className="form-label">
                  Phone
                </label>
                <PhoneInput
                  country="in"
                  value={phone}
                  onChange={setPhone}
                  enableSearch
                  inputClass="form-control"
                  containerClass="w-100"
                />
              </div>
            )}

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
              Send Verification Code
            </button>
          </form>

          <div className="text-center mt-3 small">
            <span
              className="register-link"
              onClick={() => navigate("/")}
            >
              Back to Login
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
