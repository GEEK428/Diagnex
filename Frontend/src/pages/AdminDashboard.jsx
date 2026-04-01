import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Settings,
  ShieldCheck, 
  GitFork, 
  Layers,
  UploadCloud,
  Users,
  Activity,
  Globe,
  Zap
} from "lucide-react";
import { Link } from "react-router-dom";
import API_BASE from "../config";
import { friendlyError } from "../utils/errorUtils";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState("Admin");
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [recentImports, setRecentImports] = useState([]);
  const [loadingImports, setLoadingImports] = useState(true);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/dashboard`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Could not retrieve administrative metadata.");
      const stats = await res.json();
      setData(stats);
      
      // Fetch profile to get name
      const profileRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
        headers: getAuthHeaders()
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        setUserName(profile.name || profile.email || "Admin");
      }

      // Fetch pending doctor registrations
      const notifRes = await fetch(`${API_BASE}/api/v1/admin/notifications`, {
        headers: getAuthHeaders()
      });
      if (notifRes.ok) {
        const notifs = await notifRes.json();
        setPendingRegistrations(notifs.filter(n => n.type === "DOCTOR_REGISTRATION" && n.status === "UNREAD"));
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardImports = async () => {
    try {
      setLoadingImports(true);
      const res = await fetch(`${API_BASE}/api/v1/admin/dashboard/imports`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const imports = await res.json();
        setRecentImports(imports);
      }
    } catch (err) {
      console.error("Failed to load dashboard imports", err);
    } finally {
      setLoadingImports(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchDashboardImports();
    const interval = setInterval(() => {
      fetchDashboard();
      fetchDashboardImports();
    }, 30000); 
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--sage-muted)" }}>Initializing administrative intelligence dashboard...</div>;
  if (error) return (
    <div style={{ padding: "60px 40px", textAlign: "center" }}>
      <div style={{ display: "inline-block", padding: "32px 40px", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 16, maxWidth: 480 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ color: "#991b1b", margin: "0 0 8px", fontSize: 16 }}>Unable to connect to server</h3>
        <p style={{ color: "#7f1d1d", fontSize: 13, margin: "0 0 20px", lineHeight: 1.5 }}>
          The backend server may be starting up or temporarily unreachable. Please ensure the server is running and try again.
        </p>
        <button onClick={fetchDashboard} style={{ padding: "9px 24px", background: "#2b4c3b", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-dash page-fade-in">
      <header className="dash-header">
        <h1>Welcome, {userName}</h1>
        <p>Comprehensive terminology oversight and master semantic mapping coverage statistics.</p>
      </header>



      {/* 4 Stat Cards */}
      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-label">Total Clinical Concepts</div>
          <div className="stat-value">{data.stats.totalConcepts.toLocaleString()}</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Verified Semantic Mappings</div>
          <div className="stat-value">{data.stats.totalMappings.toLocaleString()}</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">Active Coding Authorities</div>
          <div className="stat-value">{data.stats.activeSystems.toLocaleString()}</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">System-Wide Records</div>
          <div className="stat-value">{data.stats.recentImports.toLocaleString()}</div>
        </article>
      </section>



      <div className="dash-content-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          
          {/* Search Volume Trend */}
          <section className="card-main">
            <h2 className="card-title"><BarChart3 size={20} /> 7-Day Clinical Search Intelligence</h2>
            <div className="search-volume-wrap">
              {data.searchVolume.length === 0 ? (
                <div style={{ margin: "auto", fontSize: 13, color: "var(--sage-muted)" }}>Insufficient activity logs recently.</div>
              ) : (
                data.searchVolume.map((day, idx) => {
                  const max = Math.max(...data.searchVolume.map(d => d.count)) || 1;
                  const height = (day.count / max) * 100;
                  return (
                    <div key={idx} className="v-bar" style={{ height: `${height}%` }}>
                      <div className="v-count">{day.count}</div>
                      <div className="v-label">{new Date(day._id).toLocaleDateString(undefined, { weekday: "short" })}</div>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ marginTop: 40, fontSize: 11, color: "var(--sage-muted)", fontWeight: 700, letterSpacing: 1, textAlign: "center", textTransform: "uppercase" }}>
              Total clinician inquiries monitored over last 168 hours
            </div>
          </section>

          <section className="card-main">
            <h2 className="card-title"><GitFork size={20} /> Cross-System Mapping Maturity</h2>
            <div className="coverage-list" style={{ marginTop: 12 }}>
              {data.mappingCoverage.map((s, idx) => (
                <div className="coverage-item" key={idx}>
                  <div className="coverage-meta">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="status-dot high" />
                      <span>{s.system} Authority</span>
                    </div>
                    <span className="maturity-badge high">
                      {s.percentage.toFixed(1)}% Maturity
                    </span>
                  </div>
                  <div className="bar-bg">
                    <div className="bar-fill high" style={{ width: `${s.percentage}%` }}></div>
                  </div>
                  <div className="coverage-footer">
                    <span className="status-text">
                      {s.percentage >= 70 ? "Ready for clinical use" : "Awaiting further mapping"}
                    </span>
                    <span className="count-text">{s.mapped} of {s.total} concepts verified</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Quick Actions Panel */}
        <aside className="actions-card">
          <header style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--sage-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Administrative Control</h3>
            {pendingRegistrations.length > 0 && <span className="alert-badge">{pendingRegistrations.length}</span>}
          </header>
          
          <Link to="/app/admin" className="action-btn">
            <div className="icon-box" style={{ background: "#f0fdf4", color: "#166534" }}>
              <UploadCloud size={20} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span>Import Concepts</span>
              <span style={{ fontSize: 11, color: "var(--sage-muted)" }}>Last 5 imports summarized below</span>
            </div>
          </Link>

          {/* New Recent Imports Preview */}
          <div className="recent-imports-preview">
            {loadingImports ? (
              <div className="preview-loading">Scanning records...</div>
            ) : recentImports.length === 0 ? (
              <div className="preview-empty">No clinical data imports recorded.</div>
            ) : (
              <div className="preview-list">
                {recentImports.map((row, i) => (
                  <div key={i} className="preview-item">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                       <div className={`status-pill ${row.status.toLowerCase()}`}>{row.status === "SUCCESS" ? "✓" : "!"}</div>
                       <div className="preview-meta">
                         <strong>{row.codeSystem}</strong>
                         <span>{row.rowCount.toLocaleString()} codes in {row.fileName}</span>
                       </div>
                    </div>
                    <span className="preview-time">{new Date(row.importTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                ))}
                <Link to="/app/admin" className="preview-all-link">View full import history →</Link>
              </div>
            )}
          </div>

          <Link to="/app/systems" className="action-btn">
            <div className="icon-box" style={{ background: "#eff6ff", color: "#1e40af" }}>
              <Layers size={20} />
            </div>
            <span>View Authorities</span>
          </Link>

          <Link to="/app/admin/ml-feedback" className="action-btn">
            <div className="icon-box" style={{ background: "#fef2f2", color: "#991b1b" }}>
              <Zap size={20} />
            </div>
            <span>ML Evaluation</span>
          </Link>

          <Link to="/app/admin/mappings" className="action-btn">
            <div className="icon-box" style={{ background: "#fffbeb", color: "#92400e" }}>
              <GitFork size={20} />
            </div>
            <span>Global Mapping Control</span>
          </Link>

          <div style={{ marginTop: 20, padding: 20, background: "linear-gradient(135deg, #2b4c3b, #1a2c24)", borderRadius: 16, color: "white" }}>
             <ShieldCheck size={28} style={{ marginBottom: 12, opacity: 0.8 }} />
             <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>Administrative Policy</h4>
             <p style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.5, margin: 0 }}>
               Manual mappings created by administrators are automatically verified and propagated to searching agents instantly.
             </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
