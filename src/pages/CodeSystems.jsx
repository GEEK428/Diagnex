import { useState } from "react";
import { Search, Plus, Code, X, Pencil, Trash2 } from "lucide-react";
import "./CodeSystems.css";

export default function CodeSystems() {
  const [systems, setSystems] = useState([]);
  const [filter, setFilter] = useState("");
  const [createMode, setCreateMode] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  const [form, setForm] = useState({
    name: "",
    version: "",
    url: "",
    active: true
  });

  const resetForm = () => {
    setForm({ name: "", version: "", url: "", active: true });
    setCreateMode(false);
    setEditIndex(null);
  };

  const handleSave = () => {
    if (!form.name || !form.version || !form.url) return;
    const now = new Date().toISOString(); 
    setSystems((prev) => {
      if (editIndex !== null) {
        const updated = [...prev];
        updated[editIndex] = {
          ...updated[editIndex],
          ...form,
          lastUpdated: now
        };
        return updated;
      }

      // UPDATE IF NAME EXISTS
      const existingIndex = prev.findIndex(
        (s) => s.name.toLowerCase() === form.name.toLowerCase()
      );

      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...form,
          lastUpdated: now
        };
        return updated;
      }

      // ADD NEW
      return [
        ...prev,
        {
          ...form,
          description: "Custom code system",
          lastUpdated: now
        }
      ];
    });

    resetForm();
  };

  const handleEdit = (index) => {
    const s = systems[index];
    setForm({
      name: s.name,
      version: s.version,
      url: s.url,
      active: s.active
    });
    setEditIndex(index);
    setCreateMode(true);
  };

  const handleRemove = (index) => {
    setSystems((prev) => prev.filter((_, i) => i !== index));
  };

  const filtered = systems.filter((s) =>
    s.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="cs-shell">
      <div className="cs-header">
        <h1>Code Systems</h1>

        {!createMode && (
          <button className="cs-add-btn" onClick={() => setCreateMode(true)}>
            <Plus size={16} />
            Add Code System
          </button>
        )}
      </div>

      {createMode && (
        <div className="cs-create">
          <div className="cs-create-head">
            <h2>{editIndex !== null ? "Edit Code System" : "Add Code System"}</h2>
            <button onClick={resetForm}>
              <X size={16} />
            </button>
          </div>

          <div className="cs-form">
            <div className="field">
              <label>
                Name <span className="req">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </div>

            <div className="field">
              <label>
                Version <span className="req">*</span>
              </label>
              <input
                value={form.version}
                onChange={(e) =>
                  setForm({ ...form, version: e.target.value })
                }
              />
            </div>

            <div className="field wide">
              <label>
                Source URL <span className="req">*</span>
              </label>
              <input
                value={form.url}
                onChange={(e) =>
                  setForm({ ...form, url: e.target.value })
                }
              />
            </div>

            {/* ACTIVE */}
            <div className="active-row">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />
                <span>Active</span>
              </label>
            </div>

            <div className="cs-actions">
              <button className="primary" onClick={handleSave}>
                Save
              </button>
              <button onClick={resetForm}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="cs-search">
        <Search size={14} />
        <input
          placeholder="Filter code systems"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="cs-table">
        <div className="cs-table-head">
          <span>Name</span>
          <span>Version</span>
          <span>Source URL</span>
          <span>Last Updated</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {filtered.length === 0 && (
          <div className="cs-empty">No code systems added yet.</div>
        )}

        {filtered.map((s, i) => (
          <div className="cs-row" key={i}>
            <div className="cs-name">
              <div className="cs-icon">
                <Code size={14} />
              </div>
              <div>
                <div className="cs-title">{s.name}</div>
                <div className="cs-desc">{s.description}</div>
              </div>
            </div>

            <span>{s.version}</span>

            <a
              className="cs-link"
              href={s.url}
              target="_blank"
              rel="noreferrer"
            >
              {s.url}
            </a>

            <div className="cs-updated">
              <div className="cs-date">
                {new Date(s.lastUpdated).toLocaleDateString()}
              </div>
              <div className="cs-time">
                {new Date(s.lastUpdated).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </div>
            </div>

            <span
              className={`cs-status ${s.active ? "active" : "inactive"}`}
            >
              {s.active ? "Active" : "Inactive"}
            </span>

            <div className="cs-actions-col">
              <button onClick={() => handleEdit(i)} title="Edit">
                <Pencil size={14} />
              </button>
              <button onClick={() => handleRemove(i)} title="Remove">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
