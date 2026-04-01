import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AuthSplitLayout from "../components/AuthSplitLayout";
import "./Login.css";

export default function VerifyCode() {
  const navigate = useNavigate();
  const inputsRef = useRef([]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState("");

  useEffect(() => {
    if (timer === 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const next = [...otp];
    digits.forEach((d, i) => { next[i] = d; });
    setOtp(next);
    const lastFilled = Math.min(digits.length, 5);
    inputsRef.current[lastFilled]?.focus();
  };

  const verify = () => {
    if (otp.join("").length < 6) return setError("Enter all 6 digits");
    if (otp.join("") !== localStorage.getItem("otp")) {
      return setError("Incorrect verification code");
    }
    navigate("/reset-password");
  };

  const resend = () => {
    localStorage.setItem("otp", "123456");
    setOtp(["", "", "", "", "", ""]);
    setTimer(60);
    setError("");
    inputsRef.current[0]?.focus();
  };

  return (
    <AuthSplitLayout>
      <div className="login-card auth-card">
        <div className="auth-head">
          <h1 className="title">Verify Code</h1>
          <p className="subtitle">Enter the 6-digit code sent to your email</p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "center",
            marginBottom: "16px",
          }}
          onPaste={handlePaste}
        >
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              className="form-control otp-box"
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              maxLength={1}
              inputMode="numeric"
              style={{ textAlign: "center" }}
            />
          ))}
        </div>

        <div style={{ textAlign: "center", fontSize: "12.5px", marginBottom: "12px" }}>
          {timer > 0 ? (
            <span style={{ color: "#7a9aaa" }}>Resend available in {timer}s</span>
          ) : (
            <button type="button" className="register-link" onClick={resend}>
              Resend code
            </button>
          )}
        </div>

        {error && <div className="alert alert-danger mb-3">{error}</div>}

        <button className="login-btn w-100 mb-3" onClick={verify}>
          Verify Code
        </button>

        <div className="auth-switch">
          <button type="button" className="register-link" onClick={() => navigate("/login")}>
            ← Back to Login
          </button>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
