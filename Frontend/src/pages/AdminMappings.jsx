import React, { useState, useEffect, useMemo } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Trash2, 
  Check, 
  X, 
  Plus, 
  AlertCircle,
  MoreVertical,
  ChevronDown,
  ExternalLink,
  Zap
} from "lucide-react";
import API_BASE from "../config";
import { friendlyError } from "../utils/errorUtils";
import "./AdminMappings.css";

export default function AdminMappings() {
  const [activeTab, setActiveTab] = useState("PENDING"); // PENDING, VERIFIED, ALL
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    system: "ALL",
    minConfidence: 70,
    mappingType: "ALL"
  });

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [rejectModal, setRejectModal] = useState({ open: false, mappingId: null, reason: "" });
  const [addModal, setAddModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    fromSystem: "NAMASTE",
    fromCode: "",
    toSystem: "ICD11_TM2",
    toCode: "",
    mappingType: "EQUIVALENT",
    confidence: 1.0
  });

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

  const fetchMappings = async (pageNum = 1) => {
    setLoading(true);
    try {
      let url = `${ADMIN_API}/mappings?q=${search}&minConfidence=${filters.minConfidence / 100}&page=${pageNum}&limit=20`;
      if (activeTab !== "ALL") url += `&status=${activeTab}`;
      if (filters.system !== "ALL") url += `&system=${filters.system}`;
      if (filters.mappingType !== "ALL") url += `&mappingType=${filters.mappingType}`;
      
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch mappings");
      const data = await res.json();
      setMappings(data.rows || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings(1);
    setSelectedIds([]); // Clear selection when tab changes
  }, [activeTab, search, filters]);

  const handleVerify = async (id) => {
    try {
      const res = await fetch(`${ADMIN_API}/mappings/${id}/verify`, {
        method: "PATCH",
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Verification failed");
      setMappings(prev => prev.filter(m => m.id !== id));
      setSelectedIds(prev => prev.filter(i => i !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.mappingId) return;
    try {
      const res = await fetch(`${ADMIN_API}/mappings/${rejectModal.mappingId}/reject`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: rejectModal.reason })
      });
      if (!res.ok) throw new Error("Rejection failed");
      setMappings(prev => prev.filter(m => m.id !== rejectModal.mappingId));
      setSelectedIds(prev => prev.filter(i => i !== rejectModal.mappingId));
      setRejectModal({ open: false, mappingId: null, reason: "" });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch(`${ADMIN_API}/mappings/bulk-verify`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids: selectedIds, action })
      });
      if (!res.ok) throw new Error("Bulk action failed");
      
      setMappings(prev => prev.filter(m => !selectedIds.includes(m.id)));
      setSelectedIds([]);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddManual = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${ADMIN_API}/mappings`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(manualForm)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to add mapping");
      }
      setAddModal(false);
      fetchMappings();
      setManualForm({
        fromSystem: "NAMASTE", fromCode: "", toSystem: "ICD11_TM2",
        toCode: "", mappingType: "EQUIVALENT", confidence: 1.0
      });
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === mappings.length) setSelectedIds([]);
    else setSelectedIds(mappings.map(m => m.id));
  };

  return (
    <div className="admin-mappings page-fade-in">
      <header className="mappings-header">
        <div>
          <h1>Mapping Control</h1>
          <p>Expert curation of semantic relationships between disparate clinical terminology systems.</p>
        </div>
        <div className="mappings-actions">
          <button className="btn-secondary" onClick={() => fetchMappings()}>Refresh</button>
          <button className="btn-primary" onClick={() => setAddModal(true)}>
            <Plus size={16} style={{ marginRight: 8 }} />
            New Mapping
          </button>
        </div>
      </header>

      <div className="mappings-tabs">
        <button className={`tab-btn ${activeTab === "PENDING" ? "active" : ""}`} onClick={() => setActiveTab("PENDING")}>
          <Zap size={14} /> Pending Review <span className="tab-count">{activeTab === "PENDING" ? total : "?"}</span>
        </button>
        <button className={`tab-btn ${activeTab === "VERIFIED" ? "active" : ""}`} onClick={() => setActiveTab("VERIFIED")}>
          <Check size={14} /> Verified
        </button>
        <button className={`tab-btn ${activeTab === "ALL" ? "active" : ""}`} onClick={() => setActiveTab("ALL")}>
          All
        </button>
      </div>

      <div className="filters-bar">
        <div className="filter-group" style={{ flex: 1 }}>
          <label>Search Mappings</label>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--sage-muted)" }} />
            <input 
              type="text" 
              placeholder="Source code, label or system..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 34, width: "100%" }}
            />
          </div>
        </div>
        <div className="filter-group">
          <label>Target System</label>
          <select value={filters.system} onChange={(e) => setFilters({...filters, system: e.target.value})}>
            <option value="ALL">All Systems</option>
            <option value="NAMASTE">NAMASTE</option>
            <option value="ICD11_TM2">ICD11_TM2</option>
            <option value="ICD11_BIOMED">ICD11_BIOMED</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Mapping Type</label>
          <select value={filters.mappingType} onChange={(e) => setFilters({...filters, mappingType: e.target.value})}>
            <option value="ALL">All Types</option>
            <option value="EQUIVALENT">Equivalent</option>
            <option value="BROADER">Broader</option>
            <option value="NARROWER">Narrower</option>
            <option value="RELATED">Related</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Min Confidence ({filters.minConfidence}%)</label>
          <input 
            type="range" 
            min="0" max="100" 
            value={filters.minConfidence} 
            onChange={(e) => setFilters({...filters, minConfidence: parseInt(e.target.value)})} 
          />
        </div>
      </div>

      <div className="mappings-container">
        {selectedIds.length > 0 && (
          <div className="bulk-toolbar">
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--pending-deep)" }}>
              {selectedIds.length} mappings selected for bulk action
            </span>
            <div className="action-btns">
              <button className="btn-primary" onClick={() => handleBulkAction("VERIFY")}>Bulk Approve</button>
              <button className="btn-secondary" onClick={() => handleBulkAction("REJECT")} style={{ color: "var(--error-deep)" }}>Bulk Reject</button>
            </div>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {activeTab === "PENDING" && (
                  <th style={{ width: 40 }}>
                    <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === mappings.length} onChange={toggleSelectAll} />
                  </th>
                )}
                <th>Source Concept</th>
                <th>Relationship</th>
                <th>Target Concept</th>
                <th>Confidence</th>
                <th>Source</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={activeTab === "PENDING" ? 7 : 6} style={{ textAlign: "center", padding: 40 }}>Loading mappings...</td></tr>
              ) : mappings.length === 0 ? (
                <tr><td colSpan={activeTab === "PENDING" ? 7 : 6} style={{ textAlign: "center", padding: 40 }}>No mappings found matching filters.</td></tr>
              ) : mappings.map(m => (
                <tr key={m.id}>
                  {activeTab === "PENDING" && (
                    <td>
                      <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleSelect(m.id)} />
                    </td>
                  )}
                  <td>
                    <div className="concept-cell">
                      <span className="concept-code">{m.sourceCode}</span>
                      <span className="concept-name" title={m.sourceLabel}>{m.sourceLabel}</span>
                      <span style={{ fontSize: 10, color: "var(--soft-sage)" }}>{m.sourceSystem}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`relationship-badge ${m.relationship}`}>
                      {m.relationship}
                    </span>
                  </td>
                  <td>
                    <div className="concept-cell">
                      <span className="concept-code">{m.targetCode}</span>
                      <span className="concept-name" title={m.targetLabel}>{m.targetLabel}</span>
                      <span style={{ fontSize: 10, color: "var(--soft-sage)" }}>{m.targetSystem}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className="confidence-bar">
                        <div className="confidence-fill" style={{ width: `${(m.confidence || 0) * 100}%` }}></div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{Math.round((m.confidence || 0)*100)}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 11, color: "var(--sage-muted)" }}>
                    {m.createdBy}<br/>{new Date(m.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={`status-pill ${m.status.toLowerCase()}`}>
                      {m.status === "PENDING" && < Zap size={10} />}
                      {m.status === "VERIFIED" && <Check size={10} />}
                      {m.status === "REJECTED" && <X size={10} />}
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Global Pagination */}
        {total > 20 && (
          <div className="pagination-footer">
            <button disabled={page === 1} onClick={() => fetchMappings(page - 1)} className="pg-btn">Previous</button>
            <span className="pg-info">Page <strong>{page}</strong> of {Math.ceil(total / 20)} <small>({total} total)</small></span>
            <button disabled={page >= Math.ceil(total / 20)} onClick={() => fetchMappings(page + 1)} className="pg-btn">Next</button>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Reject Mapping</h2>
              <button className="btn-icon" onClick={() => setRejectModal({ ...rejectModal, open: false })}><X size={16} /></button>
            </div>
            <div className="rejection-form">
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--sage-muted)", marginBottom: 8, display: "block" }}>REASON FOR REJECTION</label>
              <textarea 
                placeholder="e.g. Inaccurate relationship type, deprecated target code..." 
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({...rejectModal, reason: e.target.value})}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setRejectModal({ ...rejectModal, open: false })}>Cancel</button>
              <button className="btn-danger" onClick={handleReject}>Reject Mapping</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Manual Modal (simplified for implementation) */}
      {addModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add Manual Mapping</h2>
              <button className="btn-icon" onClick={() => setAddModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleAddManual}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div className="form-group">
                  <label>Source System</label>
                  <select value={manualForm.fromSystem} onChange={e => setManualForm({...manualForm, fromSystem: e.target.value})}>
                    <option>NAMASTE</option>
                    <option>ICD11_TM2</option>
                    <option>ICD11_BIOMED</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Source Code</label>
                  <input type="text" placeholder="e.g. 102.4" required value={manualForm.fromCode} onChange={e => setManualForm({...manualForm, fromCode: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Target System</label>
                  <select value={manualForm.toSystem} onChange={e => setManualForm({...manualForm, toSystem: e.target.value})}>
                    <option>ICD11_TM2</option>
                    <option>NAMASTE</option>
                    <option>ICD11_BIOMED</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Target Code</label>
                  <input type="text" placeholder="e.g. ME12.Z" required value={manualForm.toCode} onChange={e => setManualForm({...manualForm, toCode: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>Relationship Type</label>
                  <select value={manualForm.mappingType} onChange={e => setManualForm({...manualForm, mappingType: e.target.value})}>
                    <option value="EQUIVALENT">Direct Equivalent (Exact Match)</option>
                    <option value="BROADER">Broader Term (Source is specific)</option>
                    <option value="NARROWER">Narrower Term (Source is general)</option>
                    <option value="RELATED">Related Concept (Non-hierarchical)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: 24 }}>
                <button type="button" className="btn-secondary" onClick={() => setAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Mapping</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
