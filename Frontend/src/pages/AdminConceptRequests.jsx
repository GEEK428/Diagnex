import React, { useState, useEffect } from "react";
import { 
  RotateCcw,
  Search,
  Filter
} from "lucide-react";
import API_BASE from "../config";
import { friendlyError } from "../utils/errorUtils";
import "./AdminConceptRequests.css";

export default function AdminConceptRequests() {
  const [activeTab, setActiveTab] = useState("PENDING"); // PENDING, APPROVED, REJECTED
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Approve Modal
  const [approveModal, setApproveModal] = useState({ open: false, request: null });
  const [approveForm, setApproveForm] = useState({
    code: "",
    system: "NAMASTE",
    term: "",
    description: "",
    tags: []
  });

  // Reject Modal
  const [rejectModal, setRejectModal] = useState({ open: false, requestId: null, reason: "" });

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };
  };

  const ADMIN_API = `${API_BASE}/api/v1/admin`;

  const fetchRequests = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/concept-requests?status=${activeTab}&page=${pageNum}&limit=20`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to fetch concept requests");
      const data = await res.json();
      setRequests(data.rows || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(1);
    setSelectedIds([]); // Reset selection when tab changes
  }, [activeTab]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === requests.length) setSelectedIds([]);
    else setSelectedIds(requests.map(r => r._id));
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    const reason = window.prompt("Reason for bulk rejection:", "Does not meet terminology criteria.");
    if (!reason) return;

    setBulkActionLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/concept-requests/bulk-reject`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids: selectedIds, reason })
      });
      if (!res.ok) throw new Error("Bulk rejection failed");
      fetchRequests();
      setSelectedIds([]);
    } catch (err) {
      alert(err.message);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const openApprove = (req) => {
    setApproveForm({
      code: req.suggestedCode || "",
      system: req.suggestedSystem || "NAMASTE",
      term: req.term || "",
      description: req.description || "",
      tags: []
    });
    setApproveModal({ open: true, request: req });
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    if (!approveModal.request) return;
    try {
      const res = await fetch(`${ADMIN_API}/concept-requests/${approveModal.request._id}/approve`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(approveForm)
      });
      if (!res.ok) throw new Error("Failed to approve request");
      
      setApproveModal({ open: false, request: null });
      fetchRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.requestId) return;
    try {
      const res = await fetch(`${ADMIN_API}/concept-requests/${rejectModal.requestId}/reject`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: rejectModal.reason })
      });
      if (!res.ok) throw new Error("Failed to reject request");
      
      setRejectModal({ open: false, requestId: null, reason: "" });
      fetchRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const s = status.toLowerCase();
    return <span className={`status-badge ${s}`}>{status}</span>;
  };

  return (
    <div className="concept-requests page-fade-in">
      <header className="requests-header">
        <h1>Concept Review</h1>
        <p>Audit and integrate clinician-suggested terminology into the master diagnostic vault.</p>
      </header>

      <div className="requests-tabs">
        <button className={`tab-btn ${activeTab === "PENDING" ? "active" : ""}`} onClick={() => setActiveTab("PENDING")}>
          Pending Submission
        </button>
        <button className={`tab-btn ${activeTab === "APPROVED" ? "active" : ""}`} onClick={() => setActiveTab("APPROVED")}>
          Integrated
        </button>
        <button className={`tab-btn ${activeTab === "REJECTED" ? "active" : ""}`} onClick={() => setActiveTab("REJECTED")}>
          Declined
        </button>
      </div>

      <div className="requests-container">
        {selectedIds.length > 0 && (
          <div className="bulk-toolbar">
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--pending-deep)" }}>
              {selectedIds.length} requests selected
            </span>
            <div className="action-btns">
              <button 
                className="btn-reject-bulk" 
                onClick={handleBulkReject}
                disabled={bulkActionLoading}
              >
                Bulk Decline
              </button>
            </div>
          </div>
        )}
        <table>
          <thead>
            <tr>
              {activeTab === "PENDING" && (
                <th style={{ width: 40 }}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length > 0 && selectedIds.length === requests.length} 
                    onChange={toggleSelectAll} 
                  />
                </th>
              )}
              <th>Requested Term</th>
              <th>Description</th>
              <th>System & Code</th>
              <th>Requested By</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={activeTab === "PENDING" ? 8 : 7} style={{ textAlign: "center", padding: 40 }}>Synchronizing clinical data...</td></tr>
            ) : error ? (
              <tr><td colSpan={activeTab === "PENDING" ? 8 : 7} style={{ textAlign: "center", padding: 40, color: "#991b1b" }}>
                ⚠️ {error} <button onClick={() => fetchRequests(1)} style={{ marginLeft: 12, padding: "6px 16px", background: "#2b4c3b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Retry</button>
              </td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={activeTab === "PENDING" ? 8 : 7} style={{ textAlign: "center", padding: 40 }}>No {activeTab.toLowerCase()} requests found.</td></tr>
            ) : requests.map(req => (
              <tr key={req._id}>
                {activeTab === "PENDING" && (
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(req._id)} 
                      onChange={() => toggleSelect(req._id)} 
                    />
                  </td>
                )}
                <td className="term-cell">{req.term}</td>
                <td className="desc-cell" title={req.description}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span>{req.description || "—"}</span>
                    {req.reason && <span style={{ fontSize: 11, color: "#92400e", marginTop: 4 }}>Reason: {req.reason}</span>}
                  </div>
                </td>
                <td>
                   <div style={{ display: "flex", flexDirection: "column" }}>
                     <span style={{ fontSize: 13, fontWeight: 700 }}>{req.suggestedSystem}</span>
                     <span style={{ fontSize: 11, color: "var(--sage-muted)" }}>{req.suggestedCode || "Not assigned"}</span>
                   </div>
                </td>
                <td>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{req.doctorName}</span>
                    <span style={{ fontSize: 11, color: "var(--sage-muted)" }}>{req.hospital || "Independent"}</span>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: "var(--sage-muted)" }}>
                  {new Date(req.createdAt).toLocaleDateString()}
                </td>
                <td>{getStatusBadge(req.status)}</td>
                <td>
                  {req.status === "PENDING" ? (
                    <div className="action-btns">
                      <button className="btn-approve" onClick={() => openApprove(req)}>Approve</button>
                      <button className="btn-reject" onClick={() => setRejectModal({ open: true, requestId: req._id, reason: "" })}>Reject</button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, fontStyle: "italic", color: "var(--sage-muted)" }}>Processed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {total > 20 && (
          <div className="requests-pagination">
             <button disabled={page === 1} onClick={() => fetchRequests(page - 1)} className="pg-btn">Previous</button>
             <span className="pg-info">Page <strong>{page}</strong> of {Math.ceil(total / 20)} <small>({total} total records)</small></span>
             <button disabled={page >= Math.ceil(total / 20)} onClick={() => fetchRequests(page + 1)} className="pg-btn">Next</button>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {approveModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Integrate Clinical Concept</h2>
              <p style={{ fontSize: 13, color: "var(--sage-muted)" }}>Staging changes before PostgreSQL insertion and ML training.</p>
            </div>
            <form onSubmit={handleApprove}>
              <div className="form-group">
                <label>Concept Code (Assign Final)</label>
                <input 
                  type="text" required 
                  placeholder="e.g. NAM-002-X"
                  value={approveForm.code}
                  onChange={e => setApproveForm({...approveForm, code: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Target Code System</label>
                <select value={approveForm.system} onChange={e => setApproveForm({...approveForm, system: e.target.value})}>
                  <option value="NAMASTE">NAMASTE</option>
                  <option value="ICD11_TM2">ICD11_TM2</option>
                  <option value="ICD11_BIOMED">ICD11_BIOMED</option>
                </select>
              </div>
              <div className="form-group">
                <label>Display Name</label>
                <input 
                  type="text" required 
                  value={approveForm.term}
                  onChange={e => setApproveForm({...approveForm, term: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Detailed Description</label>
                <textarea 
                  rows={3} 
                  value={approveForm.description}
                  onChange={e => setApproveForm({...approveForm, description: e.target.value})}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setApproveModal({ open: false, request: null })}>Cancel</button>
                <button type="submit" className="btn-primary">Finalize & Sync</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Decline Request</h2>
              <p style={{ fontSize: 13, color: "var(--sage-muted)" }}>Specify a reason for declining this request (will be visible to the requester).</p>
            </div>
            <div className="form-group">
              <label>Rejection Reason</label>
              <textarea 
                rows={4} 
                placeholder="e.g. This concept already exists under code NAM-XYZ..."
                value={rejectModal.reason}
                onChange={e => setRejectModal({...rejectModal, reason: e.target.value})}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setRejectModal({ open: false, requestId: null, reason: "" })}>Cancel</button>
              <button type="button" className="btn-primary" style={{ background: "var(--error-deep)" }} onClick={handleReject}>Reject Submission</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
