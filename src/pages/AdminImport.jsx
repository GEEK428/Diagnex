import { useRef, useState } from "react";
import { Upload, FileText, Shield } from "lucide-react";
import "./AdminImport.css";

export default function AdminImport() {
  const fileInputRef = useRef(null);
  const [uploads, setUploads] = useState([]);

  const startUpload = (file) => {
    const id = Date.now() + Math.random();

    const newUpload = {
      id,
      name: file.name,
      progress: 0,
      status: "uploading"
    };

    setUploads((prev) => [...prev, newUpload]);

    const interval = setInterval(() => {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                progress: Math.min(u.progress + Math.random() * 18, 100)
              }
            : u
        )
      );
    }, 350);

    setTimeout(() => {
      clearInterval(interval);
      setUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, progress: 100, status: "completed" } : u
        )
      );
    }, 2200);
  };

  const handleFileSelect = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    files.forEach(startUpload);
    e.target.value = null;
  };

  return (
    <div className="admin-import-shell">
      <div className="admin-import">
        <h1>Admin Import</h1>
        <p className="subtitle">
          Upload CSV files to bulk import concepts into a code system.
        </p>

        {/* Upload Card */}
        <div className="upload-card">
          <h2>Upload CSV File</h2>

          {/* Code System */}
          <label className="field">
            <span className="label">
              Code System <span className="required">*</span>
            </span>
            <select required>
              <option value="">Select a code system…</option>
              <option>NAMASTE</option>
              <option>ICD11_TM2</option>
              <option>ICD11_BIOMED</option>
              <option>SNOMED CT</option>
              <option>LOINC</option>
            </select>
          </label>

          {/* CSV Upload */}
          <div className="field">
            <span className="label">
              CSV File <span className="required">*</span>
            </span>

            <div
              className="drop-zone"
              onClick={() => fileInputRef.current.click()}
            >
              <Upload size={26} />
              <div>
                <strong>Click to upload</strong> or drag and drop
              </div>
              <small>CSV files only (Max 10MB)</small>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                multiple
                hidden
                required
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {/* Info Line */}
          <div className="import-info">
            <Shield size={14} />
            <span>
              All imports are logged and can be reviewed in the history below.
            </span>
          </div>
        </div>

        {/* Upload Progress */}
        {uploads.length > 0 && (
          <div className="upload-progress">
            {uploads.map((u) => (
              <div key={u.id} className="upload-item">
                <FileText size={16} />
                <div className="upload-info">
                  <div className="upload-name">{u.name}</div>
                  <div className="progress-bar">
                    <div
                      className="progress"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                </div>
                <span className="percent">
                  {Math.round(u.progress)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Import History (Header Only) */}
        <div className="history-header">
          <h2>Import History</h2>
          <p>No imports to display yet.</p>
        </div>
      </div>
    </div>
  );
}
