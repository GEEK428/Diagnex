import { useRef, useCallback } from "react";
import { Dna, ShieldCheck, Layers, Zap } from "lucide-react";

const FEATURES = [
  { icon: Layers, text: "One platform. Every code system. Complete clarity." },
  { icon: ShieldCheck, text: "Precision terminology for modern clinical practice." },
  { icon: Zap, text: "Bridging NAMASTE, ICD-11, and beyond." },
];

export default function AuthSplitLayout({ children }) {
  const containerRef = useRef(null);
  const glowRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current || !glowRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    glowRef.current.style.background = `radial-gradient(650px circle at ${x}px ${y}px, rgba(56,189,248,0.07), rgba(139,92,246,0.04) 40%, transparent 70%)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (glowRef.current) {
      glowRef.current.style.background = "transparent";
    }
  }, []);

  return (
    <div className="auth-page-bg">
      {/* Ambient orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      {/* Floating particles */}
      <div className="auth-particle auth-particle-1" />
      <div className="auth-particle auth-particle-2" />
      <div className="auth-particle auth-particle-3" />

      <div className="auth-shell-wrap">
        <div
          className="auth-shell"
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Cursor glow overlay */}
          <div className="auth-cursor-glow" ref={glowRef} />

          {/* Left panel */}
          <aside className="auth-side-panel">
            <div className="auth-side-brand">
              <span className="auth-side-logo">
                <Dna size={24} strokeWidth={2.2} />
              </span>
              <div>
                <p className="auth-side-name">Diagnex</p>
                <p className="auth-side-sub">Clinical Terminology Platform</p>
              </div>
            </div>

            <div className="auth-side-copy">
              <h2>
                Where Medical Language
                <br />
                <span>Finds Its Common Ground</span>
              </h2>
              <p className="auth-side-desc">
                Bridging NAMASTE, ICD-11, and beyond — sign in to continue
                your journey toward precision clinical terminology.
              </p>
            </div>

            <ul className="auth-side-points">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <li key={feature.text}>
                    <span className="auth-feat-icon">
                      <Icon size={13} strokeWidth={2.4} />
                    </span>
                    <p>{feature.text}</p>
                  </li>
                );
              })}
            </ul>

            <div className="auth-side-badge">
              <span className="auth-badge-dot" />
              <span>Precision terminology for modern clinical practice</span>
            </div>
          </aside>

          {/* Right form panel */}
          <div className="auth-main-slot">{children}</div>
        </div>
      </div>
    </div>
  );
}
