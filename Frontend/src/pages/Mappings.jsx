import { useState, useEffect } from "react";
import { 
  Search, 
  Loader2, 
  X, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowRight, 
  Plus, 
  Layers, 
  ExternalLink,
  ChevronRight,
  Database
} from "lucide-react";
import {
  searchCodes,
  getDoctorConceptById,
  addDoctorMapping,
  deactivateDoctorConcept,
  reactivateDoctorConcept,
  getPublicSystems,
  getDoctorMappings
} from "../services/codeService";
import "./Mappings.css";

export default function Mappings() {
  const [query, setQuery] = useState("");
  const [mappingResults, setMappingResults] = useState([]);
  const [conceptResults, setConceptResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [selectedId, setSelectedId] = useState(null);
  const [concept, setConcept] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  const [systems, setSystems] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [reason, setReason] = useState("");

  const [mapForm, setMapForm] = useState({
    toSystem: "",
    toCode: "",
    mappingType: "EQUIVALENT",
    confidence: 1.0
  });
  const [mapError, setMapError] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    getPublicSystems().then(setSystems).catch(console.error);
    // Initial load of recent mappings
    handleSearch(null, true);
  }, []);

  const handleSearch = async (e, isInitial = false) => {
    if (e) e.preventDefault();
    setSearching(true);
    setHasSearched(!isInitial);
    
    try {
      // 1. Search for mappings directly
      const mapRes = await getDoctorMappings(query, 1);
      setMappingResults(mapRes.rows || []);
      setTotal(mapRes.total || 0);

      // 2. If no mappings found and a query exists, search for concepts
      if ((!mapRes.rows || mapRes.rows.length === 0) && query.trim()) {
        const conceptRes = await searchCodes(query);
        setConceptResults(conceptRes.suggestions || []);
      } else {
        setConceptResults([]);
      }
    } catch (err) {
      console.error(err);
      setMappingResults([]);
      setConceptResults([]);
    } finally {
      setSearching(false);
    }
  };

  const openConcept = async (id) => {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const data = await getDoctorConceptById(id);
      setConcept(data);
      setShowAddForm(false);
      setShowDeactivateConfirm(false);
      setMapError("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeConcept = () => {
    setSelectedId(null);
    setConcept(null);
  };

  const handleDeactivate = async () => {
    try {
      await deactivateDoctorConcept(concept.id, reason || "Doctor deactivated");
      openConcept(concept.id); // Reload
    } catch (e) {
      console.error(e);
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateDoctorConcept(concept.id);
      openConcept(concept.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setMapError("");
    try {
      await addDoctorMapping({
        fromSystem: concept.codeSystem.name,
        fromCode: concept.code,
        toSystem: mapForm.toSystem,
        toCode: mapForm.toCode,
        mappingType: mapForm.mappingType,
        confidence: Number(mapForm.confidence)
      });
      setShowAddForm(false);
      setMapForm({ toSystem: "", toCode: "", mappingType: "EQUIVALENT", confidence: 1.0 });
      if (concept) openConcept(concept.id);
      handleSearch(null); // Refresh list
    } catch (err) {
      setMapError(err.response?.data?.message || "Failed to add mapping");
    }
  };

  const MAPPING_SYMBOLS = {
    EQUIVALENT: "Exact",
    BROADER: "General",
    NARROWER: "Specific",
    RELATED: "Related"
  };

  return (
    <div className="doc-mappings-page page-fade-in">
      <div className="doc-mappings-hero">
        <header className="mappings-header-text">
          <h1>Clinical Mapping Explorer</h1>
          <p>Expert-verified semantic bridges between clinical terminological systems.</p>
        </header>
        
        <form onSubmit={handleSearch} className="doc-search-bar">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon-inside" />
            <input
              autoFocus
              type="text"
              placeholder="Search code or label (e.g. Jwara, U07.1)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" disabled={searching} className="doc-search-btn">
            {searching ? <Loader2 className="spin" size={16} /> : "Search Mapping"}
          </button>
        </form>
      </div>

      <div className="mappings-content-container">
        {/* MAPPING RESULTS TABLE */}
        {mappingResults.length > 0 && (
          <div className="results-section mapping-results">
            <div className="section-header">
              <Layers size={16} />
              <h3>Direct Semantic Mappings</h3>
              <span className="count-pill">{total} verified relations</span>
            </div>
            
            <div className="doc-table-wrap">
              <table className="doc-mapping-table">
                <thead>
                  <tr>
                    <th>Source Concept</th>
                    <th style={{ textAlign: "center" }}>Relation</th>
                    <th>Target Concept</th>
                    <th>Trust</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mappingResults.map(m => (
                    <tr key={m.id} className="mapping-row-item">
                      <td>
                        <div className="concept-stack">
                          <span className="c-code">{m.sourceCode}</span>
                          <span className="c-label">{m.sourceLabel}</span>
                          <span className="c-system">{m.sourceSystem}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div className="rel-cell">
                          <div className={`rel-badge ${m.relationship}`}>
                            {MAPPING_SYMBOLS[m.relationship.toUpperCase()] || "≈"} {m.relationship}
                          </div>
                          <ChevronRight size={14} className="rel-arrow" />
                        </div>
                      </td>
                      <td>
                        <div className="concept-stack">
                          <span className="c-code">{m.targetCode}</span>
                          <span className="c-label">{m.targetLabel}</span>
                          <span className="c-system">{m.targetSystem}</span>
                        </div>
                      </td>
                      <td>
                        <div className="confidence-indicator">
                          <div className="conf-bar-mini"><div className="fill" style={{ width: `${m.confidence * 100}%` }}></div></div>
                          <span>{Math.round(m.confidence * 100)}%</span>
                        </div>
                      </td>
                      <td>
                         <button className="btn-view-detail" onClick={() => openConcept(m.sourceConceptId || m.id)}>
                           Details
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONCEPT RESULTS (FALLBACK) */}
        {conceptResults.length > 0 && mappingResults.length === 0 && (
          <div className="results-section concept-results">
            <div className="section-header">
              <Database size={16} />
              <h3>Indexed Clinical Concepts</h3>
              <span className="warning-pill">Nothing mapped with these concepts till now</span>
            </div>
            
            <div className="doc-results-grid">
              {conceptResults.map((r, i) => (
                <div key={r.id || i} className="doc-concept-card-new" onClick={() => openConcept(r.id)}>
                  <div className="card-top">
                    <span className="c-badge">{r.matchedSystem}</span>
                    <span className="c-code-large">{r.matchedCode}</span>
                  </div>
                  <h4 className="c-title">{r.displayName}</h4>
                  <p className="c-status-msg">
                    <AlertTriangle size={12} /> This concept has no active mappings.
                  </p>
                  <div className="card-footer">
                    <button className="btn-add-map-inline">
                      <Plus size={14} /> Add Mapping
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {hasSearched && mappingResults.length === 0 && conceptResults.length === 0 && !searching && (
          <div className="doc-empty-state">
            <Search size={48} className="empty-icon" />
            <h3>No results found for "{query}"</h3>
            <p>We couldn't find any mappings or clinical concepts matching your search.</p>
            <button className="ghost-btn" onClick={() => setQuery("")}>Clear Search</button>
          </div>
        )}
      </div>

      {/* --- MODAL --- */}
      {selectedId && (
        <div className="doc-modal-overlay">
          <div className="doc-modal-content">
            <button className="close-btn" onClick={closeConcept}><X size={20} /></button>
            
            {loadingDetail || !concept ? (
              <div className="spinner-wrapper"><Loader2 className="spin" size={30} /></div>
            ) : (
              <>
                <div className="modal-header">
                  <div className="header-identity">
                    <h3>{concept.displayName}</h3>
                    <div className="header-meta">
                      <span className="code">{concept.code}</span>
                      <span className="system">{concept.codeSystem.name}</span>
                    </div>
                  </div>
                  <span className={`status-pill-large ${concept.lifecycleStatus.toLowerCase()}`}>
                    {concept.lifecycleStatus}
                  </span>
                </div>

                <div className="modal-info-bar">
                   {concept.description && <p className="desc">{concept.description}</p>}
                </div>

                <div className="mappings-section">
                  <div className="section-subtitle">
                    <h4>Active Connections</h4>
                    <button className="add-btn-small" onClick={() => setShowAddForm(!showAddForm)}>
                      <Plus size={14} /> {showAddForm ? "Cancel" : "Add Mapping"}
                    </button>
                  </div>

                  {showAddForm && (
                    <form className="add-mapping-form-new" onSubmit={handleAddSubmit}>
                      <h5>Suggest New Mapping</h5>
                      {mapError && <div className="map-error">{mapError}</div>}
                      
                      <div className="form-grid">
                        <div className="form-item">
                          <label>Target System</label>
                          <select required value={mapForm.toSystem} onChange={e => setMapForm({...mapForm, toSystem: e.target.value})}>
                            <option value="">Select System</option>
                            {systems.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                        </div>
                        <div className="form-item">
                          <label>Target Code</label>
                          <input required type="text" placeholder="e.g. U07.1" value={mapForm.toCode} onChange={e => setMapForm({...mapForm, toCode: e.target.value})} />
                        </div>
                      </div>

                      <div className="form-grid">
                        <div className="form-item">
                          <label>Relationship Type</label>
                          <select required value={mapForm.mappingType} onChange={e => setMapForm({...mapForm, mappingType: e.target.value})}>
                            <option value="EQUIVALENT">EQUIVALENT (Exact Match)</option>
                            <option value="BROADER">BROADER (Target is more general)</option>
                            <option value="NARROWER">NARROWER (Target is more specific)</option>
                            <option value="RELATED">RELATED (Semantically connected)</option>
                          </select>
                        </div>
                        <div className="form-item">
                          <label>Confidence Score (0-1)</label>
                          <input type="number" step="0.05" min="0" max="1" value={mapForm.confidence} onChange={e => setMapForm({...mapForm, confidence: parseFloat(e.target.value)})} />
                        </div>
                      </div>
                      
                      <button type="submit" className="save-btn">Create verified relation</button>
                    </form>
                  )}

                  {(!concept.mappingsFrom?.length && !concept.mappingsTo?.length) ? (
                    <div className="empty-mappings-notice">
                       <AlertTriangle size={24} />
                       <p>Nothing mapped with this concept till now</p>
                       <button className="btn-link" onClick={() => setShowAddForm(true)}>Add mapping</button>
                    </div>
                  ) : (
                    <div className="mini-table-wrap">
                      <table className="mini-map-table">
                        <thead>
                          <tr>
                            <th>Link</th>
                            <th>Relationship</th>
                            <th>Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {concept.mappingsFrom?.map(m => (
                            <tr key={m.id}>
                              <td>
                                <div className="mini-concept">
                                  <strong>{m.targetConcept.code}</strong>
                                  <span>{m.targetConcept.codeSystem.name} (Target)</span>
                                </div>
                              </td>
                              <td><span className={`map-badge ${m.mappingType.toLowerCase()}`}>{m.mappingType}</span></td>
                              <td>{(m.confidence * 100).toFixed(0)}%</td>
                            </tr>
                          ))}
                          {concept.mappingsTo?.map(m => (
                            <tr key={m.id}>
                              <td>
                                <div className="mini-concept">
                                  <strong>{m.sourceConcept.code}</strong>
                                  <span>{m.sourceConcept.codeSystem.name} (Source)</span>
                                </div>
                              </td>
                              <td><span className={`map-badge ${m.mappingType.toLowerCase()}`}>FROM {m.mappingType}</span></td>
                              <td>{(m.confidence * 100).toFixed(0)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="modal-actions-footer">
                  <div className="lifecycle-controls">
                    {concept.lifecycleStatus === "ACTIVE" ? (
                      <button className="btn-danger-ghost" onClick={() => setShowDeactivateConfirm(true)}>
                        Deactivate Concept
                      </button>
                    ) : (
                      <button className="btn-success-ghost" onClick={handleReactivate}>
                        Reactivate Concept
                      </button>
                    )}
                  </div>
                  <button className="btn-close-modal" onClick={closeConcept}>Done</button>
                </div>

                {showDeactivateConfirm && (
                  <div className="deactivation-overlay">
                    <div className="confirm-box-new">
                      <h4><ShieldAlert size={18}/> Deactivating "{concept.code}"</h4>
                      <p>
                        This will cascade to all active mappings and schedule the concept for archival.
                      </p>
                      <input 
                        className="reason-input"
                        type="text" 
                        placeholder="Reason for deactivation..." 
                        value={reason} 
                        onChange={e => setReason(e.target.value)} 
                      />
                      <div className="confirm-actions">
                        <button className="btn-confirm-danger" onClick={handleDeactivate}>Confirm Deactivation</button>
                        <button className="btn-cancel" onClick={() => setShowDeactivateConfirm(false)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
