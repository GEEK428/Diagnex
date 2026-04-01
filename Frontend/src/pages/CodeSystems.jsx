import React, { useState, useEffect } from "react";
import { Plus, Edit2, History, AlertCircle, X, Info } from "lucide-react";
import { useLocation } from "react-router-dom";
import API_BASE from "../config";
import { friendlyError } from "../utils/errorUtils";
import "./CodeSystems.css";

export default function CodeSystems() {
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const location = useLocation();
  const locationMessage = location.state?.message;

  // Modals state
  const [formModal, setFormModal] = useState({ 
    open: Boolean(locationMessage), 
    mode: "create", 
    data: null 
  });
  const [versionsModal, setVersionsModal] = useState({ open: false, systemId: null, history: [] });
  const [confirmModal, setConfirmModal] = useState({ open: false, system: null });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };
  };

  const ADMIN_API = `${API_BASE}/api/v1/admin`;

  const fetchSystems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}/code-systems`, { headers: getAuthHeaders() });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch (Status: ${res.status})`);
      }
      const data = await res.json();
      setSystems(data);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleActive = async (system) => {
    const newActiveState = !system.isActive;
    
    // If attempting to deactivate, show confirmation modal first
    if (!newActiveState) {
      setConfirmModal({ open: true, system });
      return;
    }

    // Direct activation
    await executeToggle(system.id, newActiveState);
  };

  const executeToggle = async (id, active) => {
    try {
      const res = await fetch(`${ADMIN_API}/code-systems/${id}/active?active=${active}`, {
        method: "PUT",
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Failed to toggle status");
      
      const updated = await res.json();
      setSystems(systems.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      setConfirmModal({ open: false, system: null });
    } catch (err) {
      alert(err.message);
    }
  };

  const fetchVersions = async (id) => {
    try {
      const res = await fetch(`${ADMIN_API}/code-systems/${id}/versions`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch versions");
      const data = await res.json();
      setVersionsModal({ open: true, systemId: id, history: data });
    } catch (err) {
      alert("Failed to load version history");
    }
  };

  return (
    <div className="systems-page page-fade-in">
      <div className="systems-head">
        <div className="systems-head-row">
          <div>
            <h1>Code Systems Management</h1>
            <p>Administer terminology authorities, local dictionaries, and version histories.</p>
          </div>
          <button className="primary-btn" onClick={() => setFormModal({ open: true, mode: "create", data: null })}>
            <Plus size={16} /> New System
          </button>
        </div>
      </div>

      {error && (
        <div className="form-alert error">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {locationMessage && !error && (
        <div className="form-alert success" style={{ background: "#f0f4f1", color: "#2b4c3b", borderColor: "#c4d8cc" }}>
          <Info size={14} /> {locationMessage}
        </div>
      )}

      <div className="systems-card">
        <div className="systems-table-wrap">
          <table>
            <thead>
              <tr>
                <th>System Info</th>
                <th>Version</th>
                <th>Concepts</th>
                <th>Last Updated</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "#647b6d", padding: "30px" }}>
                    Loading systems...
                  </td>
                </tr>
              ) : systems.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "#647b6d", padding: "30px" }}>
                    No code systems found. Add one to get started.
                  </td>
                </tr>
              ) : (
                systems.map((sys) => (
                  <tr key={sys.id}>
                    <td>
                      <div className="name-cell">{sys.displayName || sys.name}</div>
                      <div className="truncate" style={{ fontSize: "11px", color: "#647b6d", marginTop: "2px" }}>
                        {sys.description || "—"}
                      </div>
                    </td>
                    <td>
                      <span className="version-badge" style={{ background: "#f9fafb", color: "#4b5563" }}>
                        {sys.version || "1.0"}
                      </span>
                    </td>
                    <td>
                      <span className={`count-badge ${(sys.conceptCount || 0) === 0 ? "zero" : ""}`}>
                        {(sys.conceptCount || 0).toLocaleString()} {(sys.conceptCount || 0) === 1 ? 'concept' : 'concepts'}
                      </span>
                    </td>
                    <td>
                      {new Date(sys.lastUpdated).toLocaleDateString("en-US", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </td>
                    <td>
                      <label className="toggle-switch" title={sys.isActive ? "Deactivate" : "Activate"}>
                        <input
                          type="checkbox"
                          checked={sys.isActive}
                          onChange={() => handleToggleActive(sys)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </td>
                    <td>
                      <button className="sys-action-btn" onClick={() => setFormModal({ open: true, mode: "edit", data: sys })} title="Edit System">
                        <Edit2 size={16} />
                      </button>
                      <button className="sys-action-btn" onClick={() => fetchVersions(sys.id)} title="Version History">
                        <History size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- FORM MODAL (Create/Edit) --- */}
      {formModal.open && (
        <SystemFormModal
          mode={formModal.mode}
          initialData={formModal.data}
          onClose={() => setFormModal({ open: false, mode: "create", data: null })}
          onSuccess={(updatedSys) => {
            if (formModal.mode === "create") setSystems([...systems, updatedSys]);
            else setSystems(systems.map((s) => (s.id === updatedSys.id ? { ...s, ...updatedSys } : s)));
            setFormModal({ open: false });
          }}
          apiBase={ADMIN_API}
          getAuthHeaders={getAuthHeaders}
        />
      )}

      {/* --- VERSIONS DRAWER/MODAL --- */}
      {versionsModal.open && (
        <div className="systems-modal-backdrop" onClick={() => setVersionsModal({ open: false })}>
          <div className="systems-modal drawer" onClick={(e) => e.stopPropagation()}>
            <div className="systems-modal-head">
              <h3>Version History</h3>
              <button onClick={() => setVersionsModal({ open: false })}>
                <X size={14} />
              </button>
            </div>
            {versionsModal.history.length === 0 ? (
              <p style={{ textAlign: "center", color: "#647b6d", padding: "20px 0" }}>No history found.</p>
            ) : (
              <div className="version-list">
                {versionsModal.history.map((h, i) => (
                  <div className="version-item" key={h.id || i}>
                    <div className="version-info">
                      <h4>Version {h.version}</h4>
                      <p>{h.notes || "System import or update"}</p>
                    </div>
                    <div className="version-meta">
                      <div>{h.conceptCount.toLocaleString()} concepts</div>
                      <div style={{ fontWeight: 400, marginTop: "4px" }}>
                        {new Date(h.importedAt).toLocaleString("en-US", {dateStyle: "medium", timeStyle: "short"})}
                      </div>
                      <div style={{ color: "#8cb39d", fontWeight: 400, marginTop: "2px" }}>by {h.importedBy}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CONFIRM DEACTIVATION MODAL --- */}
      {confirmModal.open && (
        <div className="systems-modal-backdrop">
          <div className="systems-modal confirm-dialog">
            <div className="systems-modal-head">
              <h3 className="danger-text">Deactivate System?</h3>
            </div>
            <p>
              Are you sure you want to deactivate <b>{confirmModal.system?.displayName}</b>? 
              This will instantly cascade and deactivate <b>{confirmModal.system?.conceptCount.toLocaleString()} associated concepts</b>, making them unavailable for searches and mapping.
            </p>
            <div className="modal-footer">
              <button className="ghost-btn" onClick={() => setConfirmModal({ open: false, system: null })}>
                Cancel
              </button>
              <button 
                className="primary-btn danger-btn" 
                onClick={() => executeToggle(confirmModal.system.id, false)}
              >
                Deactivate System
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Separate component for the Form to isolate state
function SystemFormModal({ mode, initialData, onClose, onSuccess, apiBase, getAuthHeaders }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    displayName: initialData?.displayName || "",
    description: initialData?.description || "",
    version: initialData?.version || "1.0",
    type: initialData?.type || "AUTHORITY"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const url = mode === "create" ? `${apiBase}/code-systems` : `${apiBase}/code-systems/${initialData.id}`;
    const method = mode === "create" ? "POST" : "PUT";

    // Clean up empty optional fields
    const cleanedData = { ...formData };
    
    // Automatically use displayName for the technical identifier (name) if not already set or in create mode
    if (mode === "create" || !cleanedData.name) {
      cleanedData.name = cleanedData.displayName.trim();
    }
    
    if (!cleanedData.description || !cleanedData.description.trim()) delete cleanedData.description;
    if (!cleanedData.sourceUrl || !cleanedData.sourceUrl.trim()) delete cleanedData.sourceUrl;
    if (cleanedData.name) {
      cleanedData.name = cleanedData.name.trim();
      const lowerName = cleanedData.name.toLowerCase();
      if (lowerName.includes("://") || lowerName.startsWith("http")) {
        setError("Technical names cannot be URLs. Use a clean clinical name.");
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(cleanedData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Operation failed");
      onSuccess(data);
    } catch (err) {
      setError(friendlyError(err));
      setLoading(false);
    }
  };

  return (
    <div className="systems-modal-backdrop" onClick={onClose}>
      <div className="systems-modal" onClick={(e) => e.stopPropagation()}>
        <div className="systems-modal-head">
          <h3>{mode === "create" ? "Create New System" : "Edit Code System"}</h3>
          <button onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        
        {error && (
          <div className="form-alert error">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="systems-modal-body">
            {/* Removed redundant System Identifier field - now derived from Name */}

            
            <div className="form-group">
              <label>System Name</label>
              <input 
                type="text" 
                value={formData.displayName} 
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                placeholder="e.g., ICOMED-11"
                required
              />
            </div>

            <div className="form-group">
              <label>Description (Optional)</label>
              <textarea 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Enter details about this authority or local system..."
                rows={2}
              />
            </div>

            <div className="form-group">
              <label>Source URL (Optional)</label>
              <input 
                type="text" 
                value={formData.sourceUrl || ""} 
                onChange={(e) => setFormData({...formData, sourceUrl: e.target.value})}
                placeholder="e.g., http://snomed.info/sct"
              />
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>Current Version</label>
              <input 
                type="text" 
                value={formData.version} 
                onChange={(e) => setFormData({...formData, version: e.target.value})}
                placeholder="e.g., 2024-R1"
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="ghost-btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Saving..." : "Save System"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
