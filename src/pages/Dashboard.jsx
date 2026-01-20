import { useState } from "react";
import {
  Database,
  Link2,
  Layers,
  Upload,
  Search,
  Activity,
  FileUp,
  ArrowLeft
} from "lucide-react";
import "./Dashboard.css";
const user = {
  name: "Dr. Sarah Wilson" // later replace with real profile data
};


export default function Dashboard() {
  const [view, setView] = useState("dashboard");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const [stats, setStats] = useState({
    totalConcepts: 0,
    totalMappings: 0,
    activeCodeSystems: 3,
    recentImports: 0
  });

  const [activities, setActivities] = useState([]);

  const logActivity = (title, description) => {
    setActivities((a) => [
      { title, description, time: new Date().toLocaleTimeString() },
      ...a
    ]);
  };

  const startUpload = () => {
    let p = 0;
    setUploadProgress(0);

    const timer = setInterval(() => {
      p += 10;
      setUploadProgress(p);

      if (p >= 100) {
        clearInterval(timer);
        setStats((s) => ({
          ...s,
          totalConcepts: s.totalConcepts + 250,
          recentImports: s.recentImports + 1
        }));
        logActivity("Concepts imported", "CSV upload completed");
        setView("dashboard");
      }
    }, 250);
  };

  const runSearch = () => {
    if (!searchQuery.trim()) return;
    logActivity("Code search", `Query: "${searchQuery}"`);
    setSearchQuery("");
    setView("dashboard");
  };

  const updateMappings = () => {
    setStats((s) => ({
      ...s,
      totalMappings: s.totalMappings + 120
    }));
    logActivity("Mappings updated", "New mappings added");
    setView("dashboard");
  };

  return (
    <div className="dashboard">
      {view !== "dashboard" && (
        <button className="back" onClick={() => setView("dashboard")}>
          <ArrowLeft size={14} /> Back
        </button>
      )}

      {view === "dashboard" && (
        <>
          <header className="header">
             <h1>Dashboard</h1>
             <p className="welcome">
              Welcome, {user.name}. Here’s an overview of your terminology operations.
              </p>
          </header>

          <section className="stats">
            <Stat icon={<Database size={18} />} label="Total Concepts" value={stats.totalConcepts} />
            <Stat icon={<Link2 size={18} />} label="Total Mappings" value={stats.totalMappings} />
            <Stat icon={<Layers size={18} />} label="Code Systems" value={stats.activeCodeSystems} />
            <Stat icon={<Upload size={18} />} label="Recent Imports" value={stats.recentImports} />
          </section>

          <section className="actions">
            <Action icon={<Search size={16} />} text="Search Codes" onClick={() => setView("search")} />
            <Action icon={<FileUp size={16} />} text="Upload Concepts" onClick={() => setView("upload")} />
            <Action icon={<Link2 size={16} />} text="View Mappings" onClick={() => setView("mappings")} />
          </section>

          <ActivityFeed activities={activities} />
        </>
      )}

      {view === "upload" && (
        <Panel title="Upload Concepts">
          <input type="file" />
          <button className="primary" onClick={startUpload}>Start Upload</button>
          {uploadProgress > 0 && (
            <div className="progress">
              <div style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
        </Panel>
      )}

      {view === "search" && (
        <Panel title="Search Codes">
          <input
            placeholder="Search by code or term"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="primary" onClick={runSearch}>Search</button>
        </Panel>
      )}

      {view === "mappings" && (
        <Panel title="Mappings">
          <p className="muted">Update mappings between code systems.</p>
          <button className="primary" onClick={updateMappings}>
            Update Mappings
          </button>
        </Panel>
      )}
    </div>
  );
}

/* -------- Components -------- */

function Stat({ icon, label, value }) {
  return (
    <div className="stat">
      <div className="icon">{icon}</div>
      <div>
        <span className="label">{label}</span>
        <div className="value">{value}</div>
      </div>
    </div>
  );
}

function Action({ icon, text, onClick }) {
  return (
    <button className="action" onClick={onClick}>
      {icon} {text}
    </button>
  );
}

function Panel({ title, children }) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function ActivityFeed({ activities }) {
  return (
    <section className="activity">
      <h2><Activity size={16} /> Recent Activity</h2>

      {activities.length === 0 && (
        <p className="muted">No activity yet</p>
      )}

      {activities.map((a, i) => (
        <div className="activity-row" key={i}>
          <div>
            <strong>{a.title}</strong>
            <span>{a.description}</span>
          </div>
          <time>{a.time}</time>
        </div>
      ))}
    </section>
  );
}
