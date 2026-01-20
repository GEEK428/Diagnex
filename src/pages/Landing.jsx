import { useNavigate } from "react-router-dom";
import "./Landing.css";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-wrapper">
      <header className="landing-header">
        <div className="brand">
          ⚕️ <span>NAMASTE Terminology</span>
        </div>

        <div className="actions">
          <button className="btn btn-link" onClick={() => navigate("/login")}>
            Login
          </button>
          <button className="btn btn-primary" onClick={() => navigate("/register")}>
            Get Started
          </button>
        </div>
      </header>

      <main className="landing-hero">
        <h1>Clinical Terminology, Simplified.</h1>
        <p>
          Manage concepts, mappings, and international code systems with
          enterprise-grade accuracy.
        </p>

        <div className="hero-actions">
          <button onClick={() => navigate("/register")}>
            Create Free Account
          </button>
          <button className="secondary" onClick={() => navigate("/login")}>
            Sign In
          </button>
        </div>
      </main>
    </div>
  );
}
