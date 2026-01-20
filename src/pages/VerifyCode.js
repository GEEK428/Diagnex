import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function VerifyCode() {
  const navigate = useNavigate();
  const inputsRef = useRef([]);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState("");

  useEffect(() => {
    if (timer === 0) return;
    const i = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(i);
  }, [timer]);

  const handleChange = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const n = [...otp];
    n[i] = v;
    setOtp(n);
    if (v && i < 5) inputsRef.current[i + 1].focus();
  };

  const handleBackspace = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      inputsRef.current[i - 1].focus();
    }
  };

  const verify = () => {
    if (otp.join("") !== localStorage.getItem("otp")) {
      setError("Incorrect verification code");
      return;
    }
    navigate("/reset-password");
  };

  const resend = () => {
    localStorage.setItem("otp", "123456");
    setOtp(["", "", "", "", "", ""]);
    setTimer(60);
    setError("");
    inputsRef.current[0].focus();
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h5 className="title text-center mb-3">Verify Code</h5>

        <div className="d-flex justify-content-between mb-3">
          {otp.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              className="form-control otp-box"
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleBackspace(i, e)}
              maxLength={1}
            />
          ))}
        </div>

        {/* Timer + resend (clean text UI) */}
        <div className="text-center small mb-2">
          {timer > 0 ? (
            <span className="text-muted">
              Resend available in {timer}s
            </span>
          ) : (
            <span
              className="register-link"
              onClick={resend}
            >
              Resend code
            </span>
          )}
        </div>

        {error && (
          <div className="text-danger small mb-2">
            {error}
          </div>
        )}

        <button className="btn login-btn w-100" onClick={verify}>
          Verify Code
        </button>
      </div>
    </div>
  );
}
