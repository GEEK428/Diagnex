import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Database, Layers, Search, FilePlus, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { getDoctorDashboardStats } from "../services/codeService";
import { getCurrentUser } from "../services/authService";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalConcepts: 0,
    activeSystems: 0,
    searchesToday: 0,
    myRequestsCount: 0,
    recentSearches: [],
    myRequests: []
  });
  const [showAllRequests, setShowAllRequests] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [userData, dashData] = await Promise.all([
          getCurrentUser().catch(() => ({ name: "User" })),
          getDoctorDashboardStats()
        ]);
        
        setUserName(userData.name || userData.email || "Doctor");
        
        setStats({
          totalConcepts: dashData.totalConcepts || 0,
          activeSystems: dashData.activeSystems || 0,
          searchesToday: dashData.searchesToday || 0,
          myRequestsCount: dashData.myRequestsCount || 0, // Using the backend's real count now
          recentSearches: dashData.recentSearches || [],
          myRequests: dashData.myRequests || [],
          totalRequests: dashData.totalRequests || 0
        });
      } catch (err) {
        console.error("Dashboard failed to load", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    { icon: <Database size={16} />, label: "Total Concepts", value: stats.totalConcepts },
    { icon: <Layers size={16} />, label: "Active Systems", value: stats.activeSystems },
    { icon: <Search size={16} />, label: "My Searches Today", value: stats.searchesToday },
    { icon: <Clock size={16} />, label: "My Pending Requests", value: stats.myRequestsCount }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case "APPROVED": return <span className="doc-badge approved"><CheckCircle size={10}/> Approved</span>;
      case "REJECTED": return <span className="doc-badge rejected"><AlertTriangle size={10}/> Rejected</span>;
      default: return <span className="doc-badge pending"><Clock size={10}/> Pending</span>;
    }
  };

  return (
    <div className="doc-dash-page">
      <div className="doc-dash-header">
        <div>
          <h1>Welcome, {userName || "Doctor"}</h1>
          <p>Your clinical terminology dashboard and activity summary.</p>
        </div>
        <div className="doc-dash-actions">
          <button className="primary-btn" onClick={() => navigate("/app/search")}>
            <Search size={15} /> Search Codes
          </button>
          <button className="secondary-btn" onClick={() => navigate("/app/concept-requests")}>
            <FilePlus size={15} /> Request Concept Addition
          </button>
        </div>
      </div>

      <div className="doc-stats-grid">
        {statCards.map((card, i) => (
          <div className="doc-stat-card" key={i}>
            <div className="doc-stat-icon-wrap">{card.icon}</div>
            <div className="doc-stat-data">
              <span className="doc-stat-val">{loading ? "..." : Number(card.value).toLocaleString()}</span>
              <span className="doc-stat-lbl">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="doc-dash-panels">
        {/* Recent Searches Panel */}
        <div className="doc-panel">
          <div className="doc-panel-hdr">
            <h3>My Recent Searches</h3>
          </div>
          {loading ? (
            <div className="doc-empty">Loading...</div>
          ) : stats.recentSearches.length === 0 ? (
            <div className="doc-empty">
              <p>No recent searches.</p>
            </div>
          ) : (
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Query</th>
                    <th>Source</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSearches.map(s => {
                    const matchSource = s.details.includes("source=database") ? "Database" : "AI Predicted";
                    const isAi = matchSource === "AI Predicted";
                    const confMatch = s.details.match(/conf=([\d.]+)/);
                    const conf = confMatch ? Math.round(parseFloat(confMatch[1]) * 100) + "%" : null;
                    const qMatch = s.details.match(/query=([^;]+)/);
                    const queryText = qMatch ? qMatch[1] : "-";
                    
                    return (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 600 }}>{queryText}</td>
                        <td>
                          {matchSource} 
                          {isAi && conf && <span style={{fontSize: 11, color: "var(--sage-muted)", marginLeft: 6}}>({conf})</span>}
                        </td>
                        <td style={{ color: "var(--sage-muted)", fontSize: 12 }}>
                          {new Date(s.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Concept Requests Panel */}
        <div className="doc-panel">
          <div className="doc-panel-hdr">
            <h3>My Concept Requests</h3>
            {stats.totalRequests > 3 && (
              <button 
                className="panel-view-all" 
                onClick={() => navigate("/app/concept-requests")}
              >
                View full history →
              </button>
            )}
          </div>
          {loading ? (
            <div className="doc-empty">Loading...</div>
          ) : stats.myRequests.length === 0 ? (
            <div className="doc-empty">
              <p>You haven't requested any concepts.</p>
            </div>
          ) : (
             <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Term Requested</th>
                    <th>Status</th>
                    <th>Admin Response</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.myRequests.slice(0, 3).map(req => (
                    <tr key={req._id}>
                      <td style={{ fontWeight: 600 }}>{req.term}</td>
                      <td>{getStatusBadge(req.status)}</td>
                      <td>
                        {req.status === "REJECTED" ? (
                          <span style={{color: "#dc2626", fontSize: 11.5}}>{req.rejectionReason || "Declined without comment"}</span>
                        ) : req.status === "APPROVED" ? (
                          <span style={{fontFamily: "monospace", fontSize: 11.5, color: "#166534"}}>{req.finalCode}</span>
                        ) : (
                          <span style={{color: "#a4bba8", fontSize: 11.5}}>Awaiting review</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* View All Requests Modal */}
      {showAllRequests && (
        <div className="doc-modal-overlay" onClick={() => setShowAllRequests(false)}>
          <div className="doc-modal-content" onClick={e => e.stopPropagation()}>
            <div className="doc-modal-hdr">
              <h2>All Concept Requests</h2>
              <button className="close-btn" onClick={() => setShowAllRequests(false)}>&times;</button>
            </div>
            <div className="doc-modal-body">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Term Requested</th>
                    <th>Status</th>
                    <th>Admin Response</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.myRequests.map(req => (
                    <tr key={req._id}>
                      <td style={{ fontWeight: 600 }}>{req.term}</td>
                      <td>{getStatusBadge(req.status)}</td>
                      <td>
                        {req.status === "REJECTED" ? (
                          <span style={{color: "#dc2626", fontSize: 11.5}}>{req.rejectionReason || "Declined without comment"}</span>
                        ) : req.status === "APPROVED" ? (
                          <span style={{fontFamily: "monospace", fontSize: 11.5, color: "#166534"}}>{req.finalCode}</span>
                        ) : (
                          <span style={{color: "#a4bba8", fontSize: 11.5}}>Awaiting review</span>
                        )}
                      </td>
                      <td style={{ fontSize: 11, color: "var(--sage-muted)" }}>
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
