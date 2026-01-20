import { useState } from "react";
import { FaEdit, FaUpload, FaSave, FaTimes } from "react-icons/fa";
import "./Profile.css";

export default function Profile() {
  const [editing, setEditing] = useState(false);

  // Mock user data (later comes from backend)
  const [profile, setProfile] = useState({
    name: "",
    email: "doctor@hospital.ac.in",
    phone: "",
    address: "",
    license: "",
  });

  const handleChange = (e) =>
    setProfile({ ...profile, [e.target.name]: e.target.value });

  const handleSave = () => {
    // later → API call
    setEditing(false);
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <h2>My Profile</h2>

          {!editing ? (
            <button
              className="icon-btn"
              onClick={() => setEditing(true)}
            >
              <FaEdit /> Edit
            </button>
          ) : (
            <div className="edit-actions">
              <button
                className="icon-btn"
                onClick={() => setEditing(false)}
              >
                <FaTimes /> Cancel
              </button>
              <button
                className="icon-btn primary"
                onClick={handleSave}
              >
                <FaSave /> Save
              </button>
            </div>
          )}
        </div>

        {/* Profile fields */}
        <div className="profile-grid">
          <Field
            label="Full Name"
            name="name"
            value={profile.name}
            editing={editing}
            onChange={handleChange}
          />

          <Field
            label="Email"
            name="email"
            value={profile.email}
            editing={editing}
            onChange={handleChange}
          />

          <Field
            label="Phone"
            name="phone"
            value={profile.phone}
            editing={editing}
            onChange={handleChange}
          />

          <Field
            label="Address"
            name="address"
            value={profile.address}
            editing={editing}
            onChange={handleChange}
          />

          <Field
            label="Medical License ID"
            name="license"
            value={profile.license}
            editing={editing}
            onChange={handleChange}
          />
        </div>

        {/* License Upload */}
        <div className="upload-section">
          <label className="upload-btn">
            <FaUpload /> Upload Medical License
            <input type="file" hidden />
          </label>
        </div>
      </div>
    </div>
  );
}

/* Reusable field component */
function Field({ label, value, editing, name, onChange }) {
  return (
    <div className="profile-field">
      <div className="field-label">{label}</div>

      {editing && name ? (
        <input
          className="form-control"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      ) : (
        <div className="field-value">
          {value || <span className="muted">Not provided</span>}
        </div>
      )}
    </div>
  );
}
