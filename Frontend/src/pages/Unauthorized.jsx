import { useNavigate } from "react-router-dom";
import { ShieldOff, ArrowLeft, Home } from "lucide-react";
import "./Login.css";
import "./Unauthorized.css";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="unauth-page">
      {/* Ambient orbs matching auth theme */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />
      <div className="auth-particle auth-particle-1" />
      <div className="auth-particle auth-particle-2" />
      <div className="auth-particle auth-particle-3" />

      <div className="unauth-card">
        <div className="unauth-icon-wrap">
          <ShieldOff size={36} strokeWidth={1.8} />
        </div>

        <h1 className="unauth-title">Access Restricted</h1>
        <p className="unauth-subtitle">
          You don't have the required permissions to view this page.
          This area is limited to <strong>Admin</strong> accounts only.
        </p>

        <div className="unauth-actions">
          <button
            type="button"
            className="unauth-btn unauth-btn-primary"
            onClick={() => navigate("/app")}
          >
            <Home size={15} />
            Go to Dashboard
          </button>
          <button
            type="button"
            className="unauth-btn unauth-btn-ghost"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={15} />
            Go Back
          </button>
        </div>

        <div className="unauth-footer">
          If you believe this is a mistake, please contact your system administrator.
        </div>
      </div>
    </div>
  );
}
