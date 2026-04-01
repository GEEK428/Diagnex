import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Download,
  Trash2,
  Plus,
  Database,
  History,
  Loader2,
  BarChart3
} from "lucide-react";
import {
  importConceptsFromCsv,
  getImportHistory,
  getCodeSystems,
  deleteImportHistoryEntry,
  downloadImportHistoryFile
} from "../services/codeService";
import "./AdminImport.css";

const BASE_SYSTEMS = ["NAMASTE", "ICD11_TM2", "ICD11_BIOMED"];

const normalizeSystemName = (value) =>
  (value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_-]/g, "");

const AUTO_FILE_COUNTER_KEY = "admin_import_auto_csv_counter";

const csvEscape = (value) => {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const getNextAutoCsvFileName = () => {
  let next = 1;
  try {
    const stored = Number(localStorage.getItem(AUTO_FILE_COUNTER_KEY) || "0");
    if (Number.isFinite(stored) && stored >= 0) next = stored + 1;
    localStorage.setItem(AUTO_FILE_COUNTER_KEY, String(next));
  } catch {
    next = 1;
  }
  return `codeData(${next}).csv`;
};

const parseCsvLine = (line) => {
  const parts = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  if (inQuotes) throw new Error("Unclosed quotes detected");
  return parts;
};

const parseReportRows = (reportText) => {
  const rows = String(reportText || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (rows.length === 0) throw new Error("Please enter at least one CSV data row");
  const parsed = rows.map((row, idx) => {
    const columns = parseCsvLine(row).map((value) => value.trim());
    // Allow 2 or 3 columns (description is optional)
    if (columns.length < 2 || columns.length > 3)
      throw new Error(`Line ${idx + 1} is invalid. Use 2 or 3 fields: code,name[,description]`);
    if (!columns[0] || !columns[1])
      throw new Error(`Line ${idx + 1} is invalid. code and name are required`);
    // Ensure it always has 3 elements for the rest of the app
    if (columns.length === 2) columns.push("");
    return columns;
  });
  if (parsed.length > 0) {
    const [c0, c1, c2] = parsed[0].map((v) => v.toLowerCase().replace(/[\s_-]/g, ""));
    const isHeaderRow = c0 === "code" && c1 === "displayname" && c2 === "description";
    if (isHeaderRow) return parsed.slice(1);
  }
  return parsed;
};

const buildAutoCsvFromReport = (reportText) => {
  const parsedRows = parseReportRows(reportText);
  if (parsedRows.length === 0)
    throw new Error("Please provide at least one data row under code,name,description");
  const csvRows = parsedRows.map((cols) => cols.map((value) => csvEscape(value)).join(","));
  return `code,name,description\n${csvRows.join("\n")}\n`;
};

export default function AdminImport() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [selectedSystems, setSelectedSystems] = useState(["NAMASTE"]);
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resultStats, setResultStats] = useState(null); 
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [codeSystemOptions, setCodeSystemOptions] = useState([]); // Array of {name, displayName}

  const mergedOptions = useMemo(() => {
    // Start with BASE_SYSTEMS as objects
    const baseObj = BASE_SYSTEMS.map(n => ({ name: n, displayName: n }));
    
    // Combine with loaded options
    const all = [...baseObj, ...codeSystemOptions];
    
    // De-duplicate by name
    const unique = [];
    const seen = new Set();
    for (const item of all) {
      if (!seen.has(item.name)) {
        seen.add(item.name);
        unique.push(item);
      }
    }
    
    return unique.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [codeSystemOptions]);

  const [historyPage, setHistoryPage] = useState(1);
  const [totalHistory, setTotalHistory] = useState(0);

  const loadHistory = async (page = 1) => {
    try {
      const data = await getImportHistory(page, 20);
      setHistory(Array.isArray(data.rows) ? data.rows : []);
      setTotalHistory(data.total || 0);
      setHistoryPage(data.page || 1);
    } catch {
      setHistory([]);
    }
  };

  const loadCodeSystems = async () => {
    try {
      const rows = await getCodeSystems();
      const activeSystems = Array.isArray(rows)
        ? rows.filter(r => r.isActive).map(r => ({ name: r.name, displayName: r.displayName || r.name }))
        : [];
      setCodeSystemOptions(activeSystems);
    } catch {
      setCodeSystemOptions([]);
    }
  };

  useEffect(() => {
    loadHistory();
    loadCodeSystems();
  }, []);

  useEffect(() => {
    if (!error && !success) return undefined;
    const timer = setTimeout(() => {
      setError("");
      setSuccess("");
    }, 5000);
    return () => clearTimeout(timer);
  }, [error, success]);

  useEffect(() => {
    let interval;
    if (loading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) { clearInterval(interval); return prev; }
          return prev + Math.random() * 12;
        });
      }, 250);
    } else {
      setProgress(100);
      const t = setTimeout(() => setProgress(0), 600);
      return () => clearTimeout(t);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const clearAlerts = () => {
    setError("");
    setSuccess("");
    setResultStats(null);
  };

  const pickFile = (file) => {
    if (!file) return;
    clearAlerts();
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Invalid file format. Only .csv is accepted.");
      return;
    }
    setSelectedFile(file);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    pickFile(file);
    event.target.value = null;
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    pickFile(file);
  };

  const handleDragOver = (event) => { event.preventDefault(); setDragActive(true); };
  const handleDragLeave = (event) => { event.preventDefault(); setDragActive(false); };
  const clearSelectedFile = () => { clearAlerts(); setSelectedFile(null); };

  const toggleSystem = (name) => {
    clearAlerts();
    setSelectedSystems((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const uploadAndImport = async () => {
    clearAlerts();
    if (selectedSystems.length === 0) { setError("Select at least one code system."); return; }

    const trimmedReport = reportText.trim();
    let fileToUpload = selectedFile;
    let autoGeneratedFileName = "";
    const useReportInput = Boolean(trimmedReport);

    if (useReportInput) {
      let csvContent = "";
      try { csvContent = buildAutoCsvFromReport(trimmedReport); }
      catch (e) { setError(e?.message || "Invalid report description CSV format."); return; }
      autoGeneratedFileName = getNextAutoCsvFileName();
      fileToUpload = new File([csvContent], autoGeneratedFileName, { type: "text/csv;charset=utf-8" });
    } else if (!fileToUpload) {
      setError("Please select a CSV file or enter Report Description.");
      return;
    }

    setLoading(true);

    try {
      const result = await importConceptsFromCsv(fileToUpload, selectedSystems, trimmedReport);

      const importedCount = Number(result?.totalRows || 0);
      const systemCount = Array.isArray(result?.imports) ? result.imports.length : 0;

      setResultStats({ imported: importedCount, systems: systemCount, errors: 0 });
      const generatedSuffix = autoGeneratedFileName ? ` via ${autoGeneratedFileName}` : "";
      setSuccess(`Imported ${importedCount} rows across ${systemCount} system(s)${generatedSuffix}.`);
      setSelectedFile(null);
      setReportText("");
      await loadHistory();
    } catch (err) {
      setResultStats(null);
      let message = err.response?.data?.message || err.response?.data;
      if (message instanceof Blob) {
        try { message = await message.text(); } catch { message = undefined; }
      }
      if (typeof message !== "string" || !message.trim()) {
        message = "Import failed. Accepted format: .csv with code,displayName,description header.";
      }
      setError(message);
      await loadHistory();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = async (id) => {
    clearAlerts();
    const proceed = window.confirm("Delete this import history record?");
    if (!proceed) return;
    try {
      await deleteImportHistoryEntry(id);
      await loadHistory();
      setSuccess("History record deleted.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete history record.");
    }
  };

  const handleDownloadHistory = async (row) => {
    clearAlerts();
    try {
      const blob = await downloadImportHistoryFile(row.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = row.fileName || `import-${row.id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "No stored file available for this record.");
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const HistoryTable = ({ rows }) => (
    <div className="history-table-wrap">
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Code System</th>
            <th>Timestamp</th>
            <th>Rows</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr className="empty-row">
              <td colSpan={6}>No imports yet. Upload your first CSV to get started.</td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="file-name" title={row.fileName || "-"}>{row.fileName || "-"}</td>
              <td>
                <span style={{
                  fontSize: "10px", fontWeight: 700,
                  background: "rgba(108,158,122,0.1)", color: "#2b4c3b",
                  padding: "2px 8px", borderRadius: "999px", border: "1px solid rgba(108,158,122,0.2)"
                }}>
                  {row.codeSystem || "-"}
                </span>
              </td>
              <td style={{ fontSize: "11px", color: "#647b6d" }}>{formatDate(row.importTime)}</td>
              <td style={{ fontWeight: 600 }}>{Number(row.rowCount || 0).toLocaleString()}</td>
              <td>
                <span className={`status-pill ${row.status === "SUCCESS" ? "ok" : "bad"}`}>
                  {row.status === "SUCCESS" ? "Success" : "Failed"}
                </span>
              </td>
              <td>
                <div className="history-actions">
                  <button type="button" title="Download uploaded CSV" onClick={() => handleDownloadHistory(row)}>
                    <Download size={13} />
                  </button>
                  <button type="button" title="Delete history row" className="danger" onClick={() => handleDeleteHistory(row.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const totalPages = Math.ceil(totalHistory / 20);

  return (
    <div className="import-page page-fade-in">
      <section className="import-head">
        <h1>Admin Import</h1>
        <p>Bulk-import medical concepts from CSV into global code systems with precision mapping.</p>
      </section>

      {/* ── Upload card ── */}
      <section className="import-card">
        <p className="card-section-title"><Database size={15} /> Configure Import</p>

        {/* Code systems multi-select */}
        <div className="field-group">
          <label>Target Code Systems</label>
          <button
            type="button"
            className="system-dropdown-trigger"
            onClick={() => setSystemMenuOpen((open) => !open)}
          >
            <span>
              {selectedSystems.length > 0 
                ? selectedSystems.map(name => {
                    const opt = mergedOptions.find(o => o.name === name);
                    return opt ? opt.displayName : name;
                  }).join(", ")
                : "Select systems"}
            </span>
            <ChevronDown size={14} style={{ transform: systemMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>

          {systemMenuOpen && (
            <div className="system-menu">
              {mergedOptions.map((opt) => (
                <label key={opt.name} className="system-menu-item">
                  <input
                    type="checkbox"
                    checked={selectedSystems.includes(opt.name)}
                    onChange={() => toggleSystem(opt.name)}
                  />
                  <span>{opt.displayName || opt.name}</span>
                </label>
              ))}
              <div className="other-row" style={{ padding: "8px" }}>
                <button 
                  type="button" 
                  onClick={() => navigate("/app/systems", { state: { message: "System not found? Please create your Code System locally in the database before proceeding with the import." } })}
                  style={{ width: "100%", background: "#f0f4f1", border: "1px dashed #d1e0d7", color: "#3b5a4a", padding: "8px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "11px", fontWeight: "600" }}
                >
                  <Plus size={12} /> Add New System
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drop zone */}
        <div
          className={`drop-zone ${dragActive ? "active" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="drop-icon">
            <Upload size={18} />
          </div>
          <p>{dragActive ? "Release to upload" : "Drag & drop your CSV here"}</p>
          <span className="drop-hint">or click to browse files</span>
          <button
            type="button"
            className="ghost-btn"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            Select File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={handleFileSelect}
          />
        </div>

        {selectedFile && (
          <div className="file-pill">
            <FileText size={13} />
            <span>{selectedFile.name}</span>
            <span style={{ color: "#9db8a8", fontSize: 10 }}>
              ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
            <button type="button" onClick={clearSelectedFile} title="Remove file">
              <X size={13} />
            </button>
          </div>
        )}

        {/* OR separator */}
        <div className="or-separator"><span>OR</span></div>

        {/* Report description textarea */}
        <div className="report-row">
          <label>Report Description (inline CSV rows)</label>
          <div className="report-controls">
            <textarea
              value={reportText}
              onChange={(e) => { clearAlerts(); setReportText(e.target.value); }}
              placeholder={'Enter row(s) like:\nN504,"Kasa",Respiratory condition\nN505,"Jwara",Fever with chills'}
              rows={4}
            />
          </div>
        </div>

        {/* Progress bar */}
        {loading && (
          <div className="upload-progress">
            <div className="upload-progress-label">
              <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
              Processing import…
            </div>
            <div className="upload-progress-bar-track">
              <div
                className="upload-progress-bar-fill"
                style={{ width: `${Math.min(progress, 95)}%` }}
              />
            </div>
          </div>
        )}

        {/* Result summary */}
        {resultStats && (
          <div className="result-summary">
            <div className="result-stat">
              <span className="result-stat-value">{Number(resultStats.imported).toLocaleString()}</span>
              <span className="result-stat-label">Rows Imported</span>
            </div>
            <div className="result-stat">
              <span className="result-stat-value">{resultStats.systems}</span>
              <span className="result-stat-label">Systems</span>
            </div>
            <div className={`result-stat ${resultStats.errors > 0 ? "errors" : ""}`}>
              <span className="result-stat-value">{resultStats.errors}</span>
              <span className="result-stat-label">Errors</span>
            </div>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="alert error">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
        {success && !resultStats && (
          <div className="alert success">
            <CheckCircle2 size={14} />
            <span>{success}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          className="submit-btn"
          onClick={uploadAndImport}
          disabled={loading}
        >
          {loading ? (
            <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Importing…</>
          ) : (
            <><Upload size={15} /> Upload and Import</>
          )}
        </button>
      </section>

      {/* ── Import history section ── */}
      <section className="history-card" id="history">
        <div className="history-head">
          <h2><BarChart3 size={15} style={{ color: "#6c9e7a", marginRight: 7, verticalAlign: "middle" }} />Clinical Import History</h2>
          <span className="total-badge">{totalHistory} records across authorities</span>
        </div>

        <HistoryTable rows={history} />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="history-pagination">
             <button 
               disabled={historyPage === 1} 
               onClick={() => loadHistory(historyPage - 1)}
               className="page-btn"
             >
               Previous
             </button>
             <div className="page-info">
               Page <strong>{historyPage}</strong> of {totalPages}
             </div>
             <button 
               disabled={historyPage >= totalPages} 
               onClick={() => loadHistory(historyPage + 1)}
               className="page-btn"
             >
               Next
             </button>
          </div>
        )}
      </section>

      {/* Spin keyframe for loader icon */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
