import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FilePlus, CheckCircle, AlertTriangle, Clock, Search, ExternalLink } from "lucide-react";
import { getMyConceptRequests, requestConceptAddition, getPublicSystems } from "../services/codeService";
import "./ConceptRequests.css";

export default function ConceptRequests() {
  const [params] = useSearchParams();
  const initTerm = params.get("q") || "";
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [systems, setSystems] = useState([]);
  
  const [showForm, setShowForm] = useState(!!initTerm);
  const [form, setForm] = useState({
    term: initTerm,
    description: "",
    suggestedCode: "",
    suggestedSystem: "",
    reason: ""
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await getMyConceptRequests();
      setRequests(data || []);
    } catch {
      setError("Failed to load your concept requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    getPublicSystems().then(setSystems).catch(console.error);
    if (initTerm) {
      document.getElementById("req-form")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [initTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.term.trim() || !form.description.trim() || !form.suggestedCode.trim() || !form.suggestedSystem) {
      setError("Term name, clinical description, suggested code, and target system are all required fields.");
      return;
    }
    
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      await requestConceptAddition({
        term: form.term,
        description: form.description,
        suggestedCode: form.suggestedCode,
        suggestedSystem: form.suggestedSystem || "NAMASTE",
        reason: form.reason
      });
      
      setMessage("Your request has been submitted and will be reviewed by an administrator.");
      setShowForm(false);
      setForm({ term: "", description: "", suggestedCode: "", suggestedSystem: "", reason: "" });
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong submitting your request.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "APPROVED": return <span className="req-status approved"><CheckCircle size={12}/> Approved</span>;
      case "REJECTED": return <span className="req-status rejected"><AlertTriangle size={12}/> Rejected</span>;
      default: return <span className="req-status pending"><Clock size={12}/> Pending</span>;
    }
  };

  return (
    <div className="cr-page">
      <header className="cr-header">
        <div>
          <h1>My Concept Requests</h1>
          <p>Submit unsupported clinical terms to terminology administrators for inclusion.</p>
        </div>
        <button className="primary-btn" onClick={() => setShowForm(!showForm)}>
          <FilePlus size={16} /> {showForm ? "Cancel Request" : "New Request"}
        </button>
      </header>

      {message && (
        <div className="cr-alert success">
          <CheckCircle size={18} />
          {message}
        </div>
      )}

      {error && (
        <div className="cr-alert error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {showForm && (
        <div className="cr-form-card" id="req-form">
          <div className="cr-card-header">
            <h3>New Concept Request</h3>
            <p>Ensure no equivalent concept exists under a different synonym before requesting.</p>
          </div>
          
          <form className="cr-form-grid" onSubmit={handleSubmit}>
            <div className="cr-form-group full">
              <label>Term Name <span className="req">*</span></label>
              <input 
                required
                type="text" 
                placeholder="e.g. Unspecified atypical pneumonia..." 
                value={form.term}
                onChange={e => setForm({...form, term: e.target.value})}
              />
            </div>

            <div className="cr-form-group full">
              <label>Clinical Description / Definition <span className="req">*</span></label>
              <textarea 
                required
                rows="3" 
                placeholder="Provide context on when this diagnosis or concept is explicitly utilized."
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
              ></textarea>
            </div>

            <div className="cr-form-group">
              <label>Suggested Code <span className="req">*</span></label>
              <input 
                required
                type="text" 
                placeholder="e.g. SNOMED-12345" 
                value={form.suggestedCode}
                onChange={e => setForm({...form, suggestedCode: e.target.value})}
              />
            </div>

            <div className="cr-form-group">
              <label>Suggested System <span className="req">*</span></label>
              <select 
                required
                value={form.suggestedSystem} 
                onChange={e => setForm({...form, suggestedSystem: e.target.value})}
              >
                <option value="">-- Select System --</option>
                {systems.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>

            <div className="cr-form-group full">
              <label>Clinical Reason for Addition</label>
              <input 
                type="text" 
                placeholder="Why do you need this specific concept added? (Optional)" 
                value={form.reason}
                onChange={e => setForm({...form, reason: e.target.value})}
              />
            </div>

            <div className="cr-form-actions">
              <button type="button" className="ghost-btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="primary-btn" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit to Administrator"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="cr-card">
        <div className="cr-card-header">
          <h3>My Request History</h3>
        </div>

        {loading ? (
          <div className="cr-empty">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="cr-empty">
            <Search size={32} opacity={0.3} />
            <p>No concepts requested yet.</p>
          </div>
        ) : (
          <div className="cr-table-wrap">
            <table className="cr-table">
              <thead>
                <tr>
                  <th>Requested Term</th>
                  <th>Target System</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Admin Reply / Code</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req._id}>
                    <td>
                      <strong>{req.term}</strong>
                      {req.description && <span className="cr-desc-sub">{req.description}</span>}
                    </td>
                    <td>{req.suggestedSystem || "Any"}</td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td>{getStatusBadge(req.status)}</td>
                    <td>
                      {req.status === "REJECTED" ? (
                        <span className="cr-rejected-text">{req.rejectionReason}</span>
                      ) : req.status === "APPROVED" ? (
                        <span className="cr-approved-code">{req.finalCode}</span>
                      ) : (
                        <span className="cr-muted">In review queue</span>
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
  );
}
