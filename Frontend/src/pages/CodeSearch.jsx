import { useEffect, useState } from "react";
import { Search, Sparkles, ChevronRight, X } from "lucide-react";
import "./CodeSearch.css";

import {
  searchCodes,
  runAiSearch,
  getConceptDetail,
  addMapping,
  deactivateConcept,
  getCodeSystems,
} from "../services/codeService";

const RECENT_SYSTEMS_KEY = "code_search_recent_systems";

const loadRecentSystems = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_SYSTEMS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 5) : [];
  } catch {
    return [];
  }
};

export default function CodeSearch() {
  const [query, setQuery] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [system, setSystem] = useState("ALL");
  const [minConfidence, setMinConfidence] = useState(0.45);
  const [onlyActive, setOnlyActive] = useState(true);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const [recentSystems, setRecentSystems] = useState(() => loadRecentSystems());
  const [systemOptions, setSystemOptions] = useState(["ALL", "NAMASTE", "ICD11_TM2", "ICD11_BIOMED"]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  const [mappingForm, setMappingForm] = useState({
    toSystem: "ICD11_TM2",
    toCode: "",
    mappingType: "EQUIVALENT",
    confidence: "0.95",
  });

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_SYSTEMS_KEY, JSON.stringify(recentSystems.slice(0, 5)));
    } catch {
      // Ignore storage failures.
    }
  }, [recentSystems]);

  useEffect(() => {
    const loadSystems = async () => {
      try {
        const rows = await getCodeSystems();
        const values = Array.isArray(rows)
          ? rows.map((item) => String(item?.name || "").trim().toUpperCase()).filter(Boolean)
          : [];
        const merged = ["ALL", ...Array.from(new Set([...values, "NAMASTE", "ICD11_TM2", "ICD11_BIOMED"]))];
        setSystemOptions(merged);
      } catch {
        setSystemOptions(["ALL", "NAMASTE", "ICD11_TM2", "ICD11_BIOMED"]);
      }
    };
    loadSystems();
  }, []);

  const trackRecentSystems = (items = []) => {
    const normalized = items
      .map((value) => String(value || "").trim().toUpperCase())
      .filter(Boolean);
    if (normalized.length === 0) return;

    setRecentSystems((prev) => {
      const merged = [...normalized, ...prev];
      const unique = [];
      for (const value of merged) {
        if (!unique.includes(value)) unique.push(value);
      }
      return unique.slice(0, 5);
    });
  };

  const buildCodeTags = (suggestion) => {
    const tags = [];
    if (suggestion?.namaste?.code) tags.push({ system: "NAMASTE", code: suggestion.namaste.code });
    if (suggestion?.tm2?.code) tags.push({ system: "ICD11_TM2", code: suggestion.tm2.code });
    if (suggestion?.biomed?.code) tags.push({ system: "ICD11_BIOMED", code: suggestion.biomed.code });
    return tags;
  };

  const getBandLabel = (score) => {
    if (score >= 0.8) return { label: "STRONG MATCH", class: "cs-band-strong" };
    if (score >= 0.6) return { label: "MEDIUM MATCH", class: "cs-band-medium" };
    if (score >= 0.45) return { label: "LOW MATCH", class: "cs-band-low" };
    return null;
  };

  const normalizeSuggestion = (suggestion) => ({
    title: suggestion?.displayName || "Unnamed concept",
    description: suggestion?.description || "No description available.",
    baseSystem: suggestion?.matchedSystem || "NAMASTE",
    baseCode: suggestion?.matchedCode || suggestion?.namaste?.code || "",
    active: suggestion?.active ?? true,
    codes: buildCodeTags(suggestion),
    confidence: suggestion?.confidenceScore ?? null,
  });

  const formatResults = (data) => {
    if (Array.isArray(data?.suggestions)) return data.suggestions.map(normalizeSuggestion);
    if (data && (data.displayName || data.namaste || data.tm2 || data.biomed)) return [normalizeSuggestion(data)];
    return [];
  };

  const extractSystemsFromResults = (list) => {
    const systems = [];
    list.forEach((item) => {
      if (item?.baseSystem) systems.push(item.baseSystem);
      if (Array.isArray(item?.codes)) {
        item.codes.forEach((code) => {
          if (code?.system) systems.push(code.system);
        });
      }
    });
    return systems;
  };

  const applyFilters = (list) =>
    list.filter((item) => {
      const bySystem = system === "ALL" || item.codes.some((c) => c.system === system);
      // Ensure confidence is treated as a number for comparison
      const confValue = item.confidence != null ? Number(item.confidence) : null;
      const byConf = confValue === null || confValue >= Number(minConfidence);
      const byActive = !onlyActive || item.active;
      return bySystem && byConf && byActive;
    });

  const runSearch = async (overrideQuery, overrideSystem) => {
    const q = (overrideQuery ?? query).trim();
    const targetSystem = overrideSystem ?? system;
    if (!q) {
      if (aiQuery.trim()) {
        await runAISearch();
        return;
      }
      setError("Enter a query in main search or AI assistant.");
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    setError("");
    try {
      const data = await searchCodes(q, 25, targetSystem, onlyActive, minConfidence);
      const normalized = formatResults(data);
      setResults(normalized);
      trackRecentSystems(extractSystemsFromResults(normalized));
    } catch {
      setError("Failed to fetch search results.");
    } finally {
      setLoading(false);
    }
  };

  const runAISearch = async () => {
    if (!aiQuery.trim()) {
      setError("Enter text in AI assistant to run ML prediction.");
      return;
    }
    setLoading(true);
    setSearched(true);
    setError("");
    try {
      const data = await runAiSearch(aiQuery, minConfidence);
      const normalized = formatResults(data);
      setResults(normalized);
      trackRecentSystems(extractSystemsFromResults(normalized));
    } catch (err) {
      const message =
        err.response?.data?.message ||
        `${err.response?.status ? `AI request failed (${err.response.status})` : ""}`.trim();
      setError(message || "AI service unavailable or error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (result) => {
    setDrawerOpen(true);
    setDetailLoading(true);
    setActionMsg("");
    try {
      const data = await getConceptDetail(result.baseCode, result.baseSystem);
      setDetail(data);
    } catch {
      setDetail(null);
      setActionMsg("Failed to load concept details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddMapping = async () => {
    if (!detail || !mappingForm.toCode.trim()) {
      setActionMsg("Enter target code to add mapping.");
      return;
    }
    try {
      await addMapping({
        fromSystem: detail.codeSystem,
        fromCode: detail.code,
        toSystem: mappingForm.toSystem,
        toCode: mappingForm.toCode.trim(),
        mappingType: mappingForm.mappingType,
        confidence: Number(mappingForm.confidence),
      });
      setActionMsg("Mapping added successfully.");
      const refreshed = await getConceptDetail(detail.code, detail.codeSystem);
      setDetail(refreshed);
    } catch (err) {
      setActionMsg(err.response?.data?.message || "Failed to add mapping.");
    }
  };

  const handleDeactivate = async () => {
    if (!detail) return;
    try {
      await deactivateConcept(detail.code, detail.codeSystem);
      setActionMsg("Concept deactivated.");
      const refreshed = await getConceptDetail(detail.code, detail.codeSystem);
      setDetail(refreshed);
      setResults((prev) =>
        prev.map((r) =>
          r.baseCode === detail.code && r.baseSystem === detail.codeSystem
            ? { ...r, active: false }
            : r
        )
      );
    } catch (err) {
      setActionMsg(err.response?.data?.message || "Failed to deactivate concept.");
    }
  };

  const displayedResults = applyFilters(results);
  const previewResults = displayedResults.slice(0, 3);
  const hasMoreResults = displayedResults.length > 3;

  return (
    <div className="cs-shell">
      <div className="cs-content">
        {/* Hero header */}
        <div className="cs-hero">
          <span className="cs-hero-eyebrow">TERMINOLOGY INTELLIGENCE</span>
          <h1 className="cs-hero-title">
            Discover clinical codes with{" "}
            <span className="cs-hero-accent">surgical precision.</span>
          </h1>
        </div>

        {/* Search card */}
        <div className="cs-card">
          <span className="cs-card-label">UNIVERSAL SEARCH</span>

          {/* Main search bar */}
          <div className="cs-search-bar">
            <Search size={18} className="cs-search-icon" />
            <input
              type="text"
              className="cs-search-input"
              placeholder="Search by code, concept name, or description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
          </div>

          {/* Two-column lower section */}
          <div className="cs-card-body">
            {/* Left: AI */}
            <div className="cs-card-left">
              <div className="cs-ai-header">
                <div className="cs-ai-icon"><Sparkles size={18} /></div>
                <div>
                  <div className="cs-ai-title">AI-Assisted Discovery</div>
                  <div className="cs-ai-sub">Semantic matching across unstructured clinical notes.</div>
                </div>
              </div>
              <div className="cs-ai-input-wrap">
                <textarea
                  className="cs-ai-input"
                  placeholder="Ask AI Assistant"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      runAISearch();
                    }
                  }}
                />
                <Sparkles size={14} className="cs-ai-input-icon" />
              </div>
              <button type="button" className="cs-ai-btn" onClick={runAISearch}>
                AI Search
              </button>
              <div className="cs-search-tip">
                Tip: Use quotes for exact phrase matching across multiple systems.
              </div>
            </div>

            {/* Right: Filters */}
            <div className="cs-card-right">
              {/* Only active toggle */}
              <div className="cs-system-filter">
                <label className="cs-filter-label" htmlFor="cs-system-select">Search within system</label>
                <select
                  id="cs-system-select"
                  className="cs-system-select"
                  value={system}
                  onChange={(e) => setSystem(e.target.value)}
                >
                  {systemOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Only active toggle */}
              <div className="cs-filter-row">
                <div>
                  <div className="cs-filter-label">Only active codes</div>
                  <div className="cs-filter-sub">Exclude deprecated or retired entities</div>
                </div>
                <label className="cs-toggle">
                  <input
                    type="checkbox"
                    checked={onlyActive}
                    onChange={(e) => setOnlyActive(e.target.checked)}
                  />
                  <span className="cs-toggle-slider" />
                </label>
              </div>

              {/* Confidence slider */}
              <div className="cs-confidence">
                <div className="cs-confidence-header">
                  <span className="cs-filter-label">Minimum confidence</span>
                  <span className="cs-confidence-value">{Math.round(minConfidence * 100)}%</span>
                </div>
                <input
                  type="range"
                  className="cs-range"
                  min="0.45"
                  max="1"
                  step="0.01"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Math.max(0.45, Number(e.target.value)))}
                />
                <div className="cs-range-labels">
                  <span>BROAD</span>
                  <span>PRECISE</span>
                </div>
              </div>

              {/* Execute button */}
              <button className="cs-execute-btn" onClick={() => runSearch()}>
                Execute Search →
              </button>
            </div>
          </div>
        </div>

        {/* Frequently searched */}
        <div className="cs-freq">
          <div className="cs-freq-label">FREQUENTLY SEARCHED SYSTEMS</div>
          <div className="cs-freq-chips">
            {recentSystems.length === 0 && (
              <span className="cs-search-tip">No recent systems yet. Search to populate this list.</span>
            )}
            {recentSystems.map((sys) => (
              <button
                key={sys}
                className="cs-chip"
                onClick={() => {
                  setSystem(sys);
                  if (query.trim()) {
                    runSearch(query, sys);
                  }
                }}
              >
                {sys}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "12px" }}>{error}</div>
        )}

        {/* Loading */}
        {loading && (
          <div className="cs-loading">Searching…</div>
        )}

        {/* Results */}
        {searched && !loading && (
          <div className="cs-results-section">
            <h2 className="cs-results-title">
              {displayedResults.length > 0 ? `${displayedResults.length} Results` : "No results found"}
            </h2>

            <div className="cs-notice-banner">
              <Sparkles size={14} />
              AI predictions below {Math.round(minConfidence * 100)}% confidence are automatically filtered to maintain clinical integrity.
            </div>

            {previewResults.map((r, i) => (
              <button className="cs-result-row" key={i} type="button" onClick={() => openDetail(r)}>
                <div className="cs-result-left">
                  <h3 className="cs-result-name">{r.title}</h3>
                  <p className="cs-result-desc">{r.description}</p>
                  <p className="cs-result-explain">
                    Match: {r.baseSystem} {r.baseCode ? `(${r.baseCode})` : ""} | Status:{" "}
                    {r.active ? "Active" : "Inactive"}
                  </p>
                  <div className="cs-result-tags">
                    {r.codes.map((c, j) => (
                      <span key={j} className={`cs-tag cs-tag-${c.system}`}>
                        {c.system}: {c.code}
                      </span>
                    ))}
                    {r.confidence != null && (
                      <span className={`cs-tag ${getBandLabel(r.confidence)?.class || "cs-tag-conf"}`}>
                        {getBandLabel(r.confidence)?.label || `Score: ${r.confidence.toFixed(2)}`}
                      </span>
                    )}
                    {r.confidence != null && (
                      <span className="cs-tag cs-tag-conf">{Math.round(r.confidence * 100)}% Match</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} className="cs-result-arrow" />
              </button>
            ))}

            {hasMoreResults && (
              <button
                type="button"
                className="cs-show-more-btn"
                onClick={() => setShowAllResults(true)}
              >
                Show More
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="cs-footer">© 2024 NAMASTE TERMINOLOGY MANAGEMENT SYSTEMS • CONFIDENTIAL</div>

      {/* Detail Drawer */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <aside className="detail-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <h2>Concept Details</h2>
              <button type="button" onClick={() => setDrawerOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {detailLoading && <p>Loading details…</p>}

            {!detailLoading && detail && (
              <>
                <section className="drawer-section">
                  <h3>Main info</h3>
                  <p><strong>Display name:</strong> {detail.displayName}</p>
                  <p><strong>Code:</strong> {detail.code}</p>
                  <p><strong>Code system:</strong> {detail.codeSystem}</p>
                  <p><strong>Description:</strong> {detail.description || "-"}</p>
                </section>

                <section className="drawer-section">
                  <h3>Mappings list</h3>
                  <table className="mapping-table">
                    <thead>
                      <tr>
                        <th>To Code System</th>
                        <th>Code</th>
                        <th>Mapping Type</th>
                        <th>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.mappings?.length ? (
                        detail.mappings.map((m, idx) => (
                          <tr key={idx}>
                            <td>{m.toCodeSystem}</td>
                            <td>{m.code}</td>
                            <td>{m.mappingType || "EQUIVALENT"}</td>
                            <td>{m.confidence == null ? "-" : m.confidence}</td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={4}>No mappings available</td></tr>
                      )}
                    </tbody>
                  </table>
                </section>

                <section className="drawer-section">
                  <h3>Actions</h3>
                  <div className="admin-actions-grid">
                    <select
                      value={mappingForm.toSystem}
                      onChange={(e) => setMappingForm((f) => ({ ...f, toSystem: e.target.value }))}
                    >
                      <option value="NAMASTE">NAMASTE</option>
                      <option value="ICD11_TM2">ICD11_TM2</option>
                      <option value="ICD11_BIOMED">ICD11_BIOMED</option>
                    </select>
                    <input
                      placeholder="Target code"
                      value={mappingForm.toCode}
                      onChange={(e) => setMappingForm((f) => ({ ...f, toCode: e.target.value }))}
                    />
                    <select
                      value={mappingForm.mappingType}
                      onChange={(e) => setMappingForm((f) => ({ ...f, mappingType: e.target.value }))}
                    >
                      <option value="EQUIVALENT">EQUIVALENT</option>
                      <option value="BROADER">BROADER</option>
                      <option value="NARROWER">NARROWER</option>
                      <option value="RELATED">RELATED</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={mappingForm.confidence}
                      onChange={(e) => setMappingForm((f) => ({ ...f, confidence: e.target.value }))}
                    />
                  </div>
                  <div className="drawer-buttons">
                    <button type="button" className="primary" onClick={handleAddMapping}>Add mapping</button>
                    <button type="button" className="danger" onClick={handleDeactivate}>Deactivate concept</button>
                  </div>
                </section>

                {actionMsg && <div style={{ padding: "8px 12px", background: "#f0fafa", borderRadius: "8px", fontSize: "13px", color: "#1a8b8f" }}>{actionMsg}</div>}
              </>
            )}
          </aside>
        </div>
      )}

      {showAllResults && (
        <div className="cs-modal-overlay" onClick={() => setShowAllResults(false)}>
          <div className="cs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cs-modal-head">
              <h3>All Results</h3>
              <button type="button" onClick={() => setShowAllResults(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="cs-modal-list">
              {displayedResults.map((r, i) => (
                <button
                  className="cs-result-row"
                  key={`modal-${i}`}
                  type="button"
                  onClick={() => {
                    setShowAllResults(false);
                    openDetail(r);
                  }}
                >
                  <div className="cs-result-left">
                    <h3 className="cs-result-name">{r.title}</h3>
                    <p className="cs-result-desc">{r.description}</p>
                    <p className="cs-result-explain">
                      Match: {r.baseSystem} {r.baseCode ? `(${r.baseCode})` : ""} | Status:{" "}
                      {r.active ? "Active" : "Inactive"}
                    </p>
                    <div className="cs-result-tags">
                      {r.codes.map((c, j) => (
                        <span key={j} className={`cs-tag cs-tag-${c.system}`}>
                          {c.system}: {c.code}
                        </span>
                      ))}
                      {r.confidence != null && (
                        <span className="cs-tag cs-tag-conf">Conf: {r.confidence.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="cs-result-arrow" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
