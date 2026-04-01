import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CheckCircle, AlertTriangle, SearchX, Check, X, FilePlus, ServerCrash, Sparkles } from "lucide-react";
import { searchCodes, submitMlFeedback } from "../services/codeService";
import { friendlyError } from "../utils/errorUtils";
import "./DoctorSearch.css";

const MAPPING_SYMBOLS = {
  EQUIVALENT: "≈",
  BROADER: "⊃",
  NARROWER: "⊂",
  RELATED: "↔"
};

export default function DoctorSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [minConfidence, setMinConfidence] = useState(0.45);
  const [error, setError] = useState("");
  
  // Feedback state
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctCode, setCorrectCode] = useState("");
  const [correctSystem, setCorrectSystem] = useState("NAMASTE");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError("");
    setResult(null);
    setFeedbackSent(false);
    setShowCorrectionForm(false);
    setCorrectCode("");

    try {
      const res = await searchCodes(query.trim(), 10, "ALL", true, Number(minConfidence));
      
      // Strict frontend enforcement: Filter results based on the current threshold
      if (res && Array.isArray(res.suggestions)) {
        res.suggestions = res.suggestions.filter(s => {
          const score = Number(s.confidenceScore ?? s.confidence ?? 0);
          // Only filter matches with a score; verified/database matches usually have null score
          return (s.confidenceScore == null && s.confidence == null) || score >= Number(minConfidence);
        });
      }

      // Also filter best guess if it's below the threshold
      if (res && res.bestGuess) {
        const score = Number(res.bestGuess.confidence ?? 0);
        if (score < Number(minConfidence)) {
          res.bestGuess = null;
          if (res.suggestions?.length === 0) {
            res.status = "no_result";
          }
        }
      }

      setResult(res);
    } catch (err) {
      setError(friendlyError(err) || "An error occurred during search.");
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (isCorrect) => {
    if (isCorrect) {
      try {
        const suggestion = result.suggestions?.[0] || result.bestGuess;
        await submitMlFeedback({
          query: query,
          predictedCode: suggestion?.matchedCode || suggestion?.code || "",
          predictedSystem: suggestion?.matchedSystem || suggestion?.codeSystem || "NAMASTE",
          correctCode: suggestion?.matchedCode || suggestion?.code || "",
          correctSystem: suggestion?.matchedSystem || suggestion?.codeSystem || "NAMASTE",
          feedbackType: "confirmed",
          confidence: result.confidence || (suggestion?.confidenceScore ?? 0)
        });
        setFeedbackSent(true);
      } catch (err) {
        console.error("Feedback failed", err);
      }
    } else {
      setShowCorrectionForm(true);
    }
  };

  const submitCorrection = async () => {
    if (!correctCode.trim() || !correctSystem) return;
    try {
      const suggestion = result.suggestions?.[0] || result.bestGuess;
      await submitMlFeedback({
        query: query,
        predictedCode: suggestion?.matchedCode || suggestion?.code || "",
        predictedSystem: suggestion?.matchedSystem || suggestion?.codeSystem || "NAMASTE",
        correctCode: correctCode.trim(),
        correctSystem: correctSystem,
        feedbackType: "corrected",
        confidence: result.confidence || (suggestion?.confidenceScore ?? 0)
      });
      setFeedbackSent(true);
      setShowCorrectionForm(false);
    } catch (err) {
      console.error("Correction failed", err);
    }
  };

  const routeToRequest = () => {
    navigate(`/app/concept-requests?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="doctor-search-container">
      <div className="search-header">
        <h1>Clinical Concept Search</h1>
        <p>Unified search across standardized medical terminologies</p>
      </div>

      <form className="search-bar-wrapper" onSubmit={handleSearch}>
        <Search className="search-icon" size={24} />
        <input
          type="text"
          className="search-input"
          placeholder="Search for diagnosis, procedure, or medical concept..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button type="submit" className="search-button" disabled={loading || !query.trim()}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {/* Confidence Slider Control */}
      <div className="confidence-control">
        <div className="conf-slider-header">
          <span className="conf-label">Clinical Precision Threshold</span>
          <span className="conf-value">{Math.round(minConfidence * 100)}%</span>
        </div>
        <input 
          type="range" 
          className="conf-slider-input"
          min="0.45" 
          max="1" 
          step="0.01" 
          value={minConfidence}
          onChange={(e) => setMinConfidence(Number(e.target.value))}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--sage-muted)", fontWeight: 600 }}>
          <span>BROAD MATCH (45%)</span>
          <span>PRECISE ONLY (100%)</span>
        </div>
      </div>

      {result && !loading && (
        <div className="doc-notice-banner">
          <Sparkles size={14} />
          <span>Showing results above {Math.round(minConfidence * 100)}% confidence. Lower-quality matches are automatically excluded.</span>
        </div>
      )}

      {error && (
        <div className="empty-state" style={{ borderColor: "#fecaca", background: "#fef2f2" }}>
          <AlertTriangle className="empty-icon" size={48} color="#dc2626" opacity={0.8} />
          <h3 style={{ color: "#991b1b" }}>Search Error</h3>
          <p style={{ color: "#b91c1c" }}>{error}</p>
        </div>
      )}

      {result && !loading && (
        <div className="results-container">
          
          {/* SUCCESS / MEDIUM CONFIDENCE */}
          {(result.status === "success" || result.status === "medium_confidence") && result.suggestions.length > 0 && (
            <div className={`result-card ${result.source === "ml" ? "ai-matched" : ""}`}>
              <div className="result-header">
                <div className="result-title">
                  <h3>{result.suggestions[0].displayName}</h3>
                  <div className="result-meta">
                    <span>System: <strong>{result.suggestions[0].matchedSystem}</strong></span>
                    <span>Code: <strong>{result.suggestions[0].matchedCode}</strong></span>
                  </div>
                </div>
                
                {result.source === "database" && (
                  <div className="badge verified">
                    <CheckCircle size={14} /> Verified Match
                  </div>
                )}
                {result.source === "ml" && (
                  <div className={`badge ${result.confidence >= 0.8 ? "ai-strong" : result.confidence >= 0.6 ? "ai-medium" : "ai-low"}`}>
                    {result.status === "success" ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                    {result.confidence >= 0.8 ? "Strong Match" : result.confidence >= 0.6 ? "Medium Match" : "Low Match"} ({Math.round(result.confidence * 100)}%)
                  </div>
                )}
              </div>

              {result.confidenceBand === "medium" && (
                <div className="hint-box" style={{ width: "100%", marginBottom: "16px" }}>
                  <span>Medium confidence match. Please verify this code matches your clinical intent before use.</span>
                </div>
              )}

              {result.suggestions[0].translations && result.suggestions[0].translations.length > 0 && (
                <div className="mappings-grid">
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--sage-muted)", marginBottom: 8 }}>
                    CROSS-SYSTEM MAPPINGS
                  </div>
                  {result.suggestions[0].translations.map((t, i) => (
                    <div className="mapping-row" key={i}>
                      <span className="mapping-system">{t.codeSystem}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "var(--sage-muted)", fontWeight: 600 }}>
                          {MAPPING_SYMBOLS[t.mappingType] || "≈"} {t.mappingType}
                        </span>
                        <span className="mapping-code">{t.code}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Feedback Actions for ML matches */}
              {result.source === "ml" && (
                <div className="feedback-actions">
                  {!feedbackSent && !showCorrectionForm ? (
                    <>
                      <span style={{ fontSize: 13, color: "var(--sage-muted)", marginRight: 8, marginTop: 10 }}>
                        Did AI get this right?
                      </span>
                      <button className="feedback-btn correct" onClick={() => handleFeedback(true)}>
                        <Check size={16} /> Yes
                      </button>
                      <button className="feedback-btn wrong" onClick={() => handleFeedback(false)}>
                        <X size={16} /> No
                      </button>
                    </>
                  ) : feedbackSent ? (
                    <span style={{ fontSize: 13, color: "#15803d", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle size={16} /> Feedback saved. Thank you!
                    </span>
                  ) : showCorrectionForm ? (
                    <div className="correction-form" style={{ width: "100%" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px", marginBottom: "12px" }}>
                        <div>
                          <label>Provide Correct Code <span style={{color:"#dc2626"}}>*</span></label>
                          <input
                            type="text"
                            className="correction-input"
                            placeholder="e.g. AYU-001"
                            value={correctCode}
                            onChange={(e) => setCorrectCode(e.target.value)}
                            required
                            style={{ marginBottom: 0 }}
                          />
                        </div>
                        <div>
                          <label>System <span style={{color:"#dc2626"}}>*</span></label>
                          <select 
                            className="correction-input"
                            value={correctSystem}
                            onChange={(e) => setCorrectSystem(e.target.value)}
                            required
                            style={{ marginBottom: 0 }}
                          >
                            <option value="NAMASTE">NAMASTE</option>
                            <option value="ICD11_TM2">ICD11_TM2</option>
                            <option value="ICD11_BIOMED">ICD11_BIOMED</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                        <button className="secondary-btn" onClick={() => setShowCorrectionForm(false)} style={{ padding: "8px 16px", fontSize: 13 }}>
                          Cancel
                        </button>
                        <button className="submit-btn" onClick={submitCorrection} disabled={!correctCode.trim()} style={{ padding: "8px 16px", fontSize: 13 }}>
                          Submit Correction
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* LOW CONFIDENCE */}
          {result.status === "low_confidence" && (
             <div className="empty-state">
               <AlertTriangle className="empty-icon" size={48} />
               <h3>No reliable match found for "{query}"</h3>
               <p>The AI model found a potential match but confidence is too low to suggest automatically.</p>
               
               {result.bestGuess && (
                 <div className="hint-box">
                   <span>AI Best Guess: <strong>{result.bestGuess.displayName} ({result.bestGuess.code})</strong> in <strong>{result.bestGuess.codeSystem || "NAMASTE"}</strong></span>
                   <span style={{ fontSize: 12, opacity: 0.8 }}>Confidence: {Math.round(result.confidence * 100)}%</span>
                 </div>
               )}
               <br />
               <button className="secondary-btn" onClick={routeToRequest}>
                 <FilePlus size={18} /> Request Concept Addition
               </button>
             </div>
          )}

          {/* NO RESULT */}
          {result.status === "no_result" && (
             <div className="empty-state">
               <SearchX className="empty-icon" size={48} />
               <h3>No results found for "{query}"</h3>
               <p>We couldn't find a matching concept in the database or via AI.</p>
               
               <button className="secondary-btn" onClick={routeToRequest}>
                 <FilePlus size={18} /> Request Concept Addition
               </button>
             </div>
          )}

          {/* ML UNAVAILABLE */}
          {result.status === "ml_unavailable" && (
             <div className="empty-state">
               <ServerCrash className="empty-icon" size={48} />
               <h3>AI Service Unavailable</h3>
               <p>{result.message}</p>
             </div>
          )}

        </div>
      )}
    </div>
  );
}
