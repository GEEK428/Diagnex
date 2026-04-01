import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Download, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Filter, 
  FileCheck,
  RefreshCw,
  PieChart,
  BrainCircuit,
  User
} from "lucide-react";
import API_BASE from "../config";
import { friendlyError } from "../utils/errorUtils";
import "./AdminMlFeedback.css";

export default function AdminMlFeedback() {
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState({ total: 0, correctionRate: 0, pendingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportMessage, setExportMessage] = useState("");
  
  // Filters
  const [showReviewed, setShowReviewed] = useState(false);
  const [minConf, setMinConf] = useState(0);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };
  };

  const ADMIN_API = `${API_BASE}/api/v1/admin`;

  const fetchFeedback = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/ml-feedback?reviewed=${showReviewed}&minConf=${minConf/100}&page=${pageNum}&limit=20`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to fetch ML feedback");
      const data = await res.json();
      setFeedback(data.rows || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${ADMIN_API}/ml-feedback/stats`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to fetch ML stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFeedback(1);
    setSelectedIds([]); // Clear selection on filter change
  }, [showReviewed, minConf]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleReview = async (id, decision = "ACCEPTED") => {
    try {
      const res = await fetch(`${ADMIN_API}/ml-feedback/${id}/review`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ decision })
      });
      if (!res.ok) throw new Error("Failed to process review");
      
      setFeedback(prev => prev.filter(f => f._id !== id));
      setSelectedIds(prev => prev.filter(i => i !== id));
      fetchStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBulkAction = async (decision = "ACCEPTED") => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/ml-feedback/bulk-review`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids: selectedIds, decision })
      });
      if (!res.ok) throw new Error("Bulk action failed");
      
      fetchFeedback(page);
      setSelectedIds([]);
      fetchStats();
    } catch (err) {
      alert(err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === feedback.length) setSelectedIds([]);
    else setSelectedIds(feedback.map(f => f._id));
  };

  const handleExport = () => {
    const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
    setExportMessage("Retraining dataset preparation initiated. Only confirmed and accepted corrections will be included...");
    setTimeout(() => {
      window.open(`${ADMIN_API}/ml-feedback/export?token=${token}`, "_blank");
      setExportMessage("");
    }, 2000);
  };

  return (
    <div className="ml-feedback page-fade-in">
      <header className="ml-header">
        <div>
          <h1>Intelligence Review</h1>
          <p>Continuous refinement of AI diagnostic predictions through expert clinician feedback loops.</p>
        </div>
        <button className="btn-export" onClick={handleExport}>
          <Download size={18} /> Export Dataset
        </button>
      </header>

      <section className="ml-stats-row">
        <article className="stat-card">
          <h3>Total Intelligence Feedbacks</h3>
          <div className="value">{stats.total.toLocaleString()}</div>
        </article>
        <article className="stat-card">
          <h3>Clinician Correction Rate</h3>
          <div className="value" style={{ color: "var(--pending-deep)" }}>{stats.correctionRate.toFixed(1)}%</div>
        </article>
        <article className="stat-card">
          <h3>Pending Action Queue</h3>
          <div className="value" style={{ color: "var(--error-deep)" }}>{stats.pendingCount}</div>
        </article>
      </section>

      {exportMessage && (
        <div className="export-notification page-fade-in">
          <BrainCircuit size={18} className="spin-slow" />
          {exportMessage}
        </div>
      )}

      <div className="ml-container">
        <div className="filters-bar">
          <div className="filter-group">
            <label>Review Status</label>
            <select value={showReviewed} onChange={e => setShowReviewed(e.target.value === "true")}>
              <option value="false">Unreviewed Items</option>
              <option value="true">Archive / Reviewed</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Confidence Threshold ({minConf}%)</label>
            <input type="range" min="0" max="100" value={minConf} onChange={e => setMinConf(e.target.value)} />
          </div>
          <div style={{ marginLeft: "auto", fontSize: 13, color: "var(--sage-muted)", fontWeight: 700 }}>
            {total} entries available
          </div>
        </div>

        {selectedIds.length > 0 && !showReviewed && (
          <div className="bulk-toolbar intelligence-bulk">
            <div className="bulk-selection-info">
              <BrainCircuit size={16} />
              <span>{selectedIds.length} clinical signals selected</span>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
               <button className="btn-bulk acknowledge" onClick={() => handleBulkAction("ACCEPTED")} disabled={bulkLoading}>
                 Bulk Acknowledge Clinical Signals
               </button>
            </div>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {!showReviewed && (
                   <th style={{ width: 40 }}>
                     <input 
                       type="checkbox" 
                       checked={selectedIds.length > 0 && selectedIds.length === feedback.length} 
                       onChange={toggleSelectAll} 
                     />
                   </th>
                )}
                <th>Query</th>
                <th>Predicted</th>
                <th>Confidence</th>
                <th>Clinician Feedback</th>
                <th>Decision</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 40 }}>Processing clinical feedback intelligence...</td></tr>
              ) : error ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "#991b1b" }}>
                  ⚠️ {error} <button onClick={() => fetchFeedback(1)} style={{ marginLeft: 12, padding: "6px 16px", background: "#2b4c3b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Retry</button>
                </td></tr>
              ) : feedback.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 40 }}>No ML feedback items found matching filter criteria.</td></tr>
              ) : feedback.map(f => (
                <tr key={f._id} className={selectedIds.includes(f._id) ? "row-selected" : ""}>
                   {!showReviewed && (
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(f._id)} 
                        onChange={() => toggleSelect(f._id)} 
                      />
                    </td>
                  )}
                  <td className="query-cell">"{f.query}"</td>
                  <td>
                    {f.predictedCode ? (
                      <div className="prediction-wrap">
                        <span className="code-badge predicted">{f.predictedCode}</span>
                        <span className="system-sub">{f.predictedSystem || "NAMASTE"}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, fontStyle: "italic", color: "#ccc" }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{Math.round((f.confidence || 0) * 100)}%</div>
                    <div className="confidence-bar">
                      <div className="confidence-fill" style={{ width: `${(f.confidence || 0) * 100}%` }}></div>
                    </div>
                  </td>
                  <td>
                    <div className="feedback-cell">
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 800,
                        color: f.feedbackType === "confirmed" ? "var(--forest-green)" : "var(--pending-deep)",
                        marginBottom: 4
                      }}>
                        {f.feedbackType === "confirmed" ? <CheckCircle2 size={13} /> : <Zap size={13} />}
                        {f.feedbackType === "confirmed" ? "MATCHED" : "CLINICIAN CORRECTION"}
                      </div>
                      
                      {f.feedbackType === "corrected" ? (
                         <div className="correction-details" style={{ 
                           background: "#fff9f1", 
                           border: "1px solid #fee1b4", 
                           padding: "6px 10px", 
                           borderRadius: 6 
                         }}>
                           <div style={{ fontSize: 10, color: "var(--sage-muted)", textTransform: "uppercase", fontWeight: 700 }}>Clinician Suggestion:</div>
                           <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                             <span className="code-badge" style={{ background: "var(--pending-soft)", color: "var(--pending-deep)" }}>{f.correctCode}</span>
                             <span className="system-sub" style={{ fontSize: 10 }}>{f.correctSystem || "NAMASTE"}</span>
                           </div>
                         </div>
                      ) : (
                        <div style={{ fontSize: 11, color: "var(--sage-muted)" }}>Clinician confirmed AI prediction is correct.</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      padding: "4px 8px", 
                      fontSize: 10, 
                      fontWeight: 700, 
                      borderRadius: 4, 
                      background: f.adminDecision === "ACCEPTED" ? "var(--success-soft)" : f.adminDecision === "PENDING" ? "var(--sage-border)" : "var(--error-soft)",
                      color: f.adminDecision === "ACCEPTED" ? "var(--success-deep)" : f.adminDecision === "PENDING" ? "#647b6d" : "var(--error-deep)",
                      textTransform: "uppercase"
                    }}>
                      {f.adminDecision === "IGNORED" ? "DECLINED" : f.adminDecision}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: "var(--sage-muted)" }}>
                    {new Date(f.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {!f.reviewed ? (
                        <>
                          {f.feedbackType === "confirmed" ? (
                            <button className="btn-review acknowledge" onClick={() => handleReview(f._id, "ACCEPTED")}>
                               Acknowledge Match
                            </button>
                          ) : (
                            <>
                               <button className="btn-review accept" onClick={() => handleReview(f._id, "ACCEPTED")}>
                                  Approve Suggestion
                               </button>
                               <button className="btn-review ignore" onClick={() => handleReview(f._id, "IGNORED")}>
                                  Decline Suggestion
                               </button>
                            </>
                          )}
                        </>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, color: f.adminDecision === "ACCEPTED" ? "var(--success-deep)" : "var(--error-deep)", fontWeight: 700, fontSize: 11 }}>
                            <CheckCircle2 size={12} /> {f.adminDecision === "IGNORED" ? "DECLINED" : f.adminDecision}
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button 
                              className="btn-tiny" 
                              onClick={() => handleReview(f._id, f.adminDecision === "ACCEPTED" ? "IGNORED" : "ACCEPTED")}
                              style={{ 
                                fontSize: 9, 
                                padding: "2px 6px", 
                                background: "none", 
                                border: "1px solid var(--sage-border)", 
                                borderRadius: 4, 
                                cursor: "pointer", 
                                color: "var(--sage-muted)" 
                              }}
                            >
                              Change Decision
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > 20 && (
          <div className="feedback-pagination">
             <button disabled={page === 1} onClick={() => fetchFeedback(page - 1)} className="pg-btn">Previous</button>
             <span className="pg-info">Page <strong>{page}</strong> of {Math.ceil(total / 20)} <small>({total} total)</small></span>
             <button disabled={page >= Math.ceil(total / 20)} onClick={() => fetchFeedback(page + 1)} className="pg-btn">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
