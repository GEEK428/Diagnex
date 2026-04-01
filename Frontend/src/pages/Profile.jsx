import { useState, useEffect } from "react";
import { FaEdit, FaUpload, FaSave, FaTimes, FaSpinner } from "react-icons/fa";
import { getCurrentUser, updateProfile } from "../services/authService";
import "./Profile.css";

export default function Profile() {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    address: "",
    license: "",
    gender: "",
    hospital: "",
  });

  const [original, setOriginal] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await getCurrentUser();
        const data = {
          name: user.name || "",
          email: user.email || "",
          address: user.address || "",
          license: user.licenseNumber || "",
          gender: user.gender || "",
          hospital: user.hospital || "",
        };
        setProfile(data);
        setOriginal(data);
      } catch (err) {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) =>
    setProfile({ ...profile, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateProfile({
        name: profile.name,
        address: profile.address,
        licenseNumber: profile.license,
      });
      const data = {
        name: updated.name || "",
        email: updated.email || "",
        address: updated.address || "",
        license: updated.licenseNumber || "",
        gender: updated.gender || "",
        hospital: updated.hospital || "",
      };
      setProfile(data);
      setOriginal(data);
      setEditing(false);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProfile(original);
    setEditing(false);
    setError("");
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-card" style={{ textAlign: "center", padding: "40px" }}>
          <FaSpinner className="fa-spin" size={24} />
          <p style={{ marginTop: "10px", color: "#6f8a96" }}>Loading profile...</p>
        </div>
      </div>
    );
  }

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
                onClick={handleCancel}
              >
                <FaTimes /> Cancel
              </button>
              <button
                className="icon-btn primary"
                onClick={handleSave}
                disabled={saving}
              >
                <FaSave /> {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-danger p-2 small mb-2">{error}</div>
        )}
        {success && (
          <div className="alert alert-success p-2 small mb-2">{success}</div>
        )}

        {/* Profile Fields */}
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
            editing={false}
            onChange={handleChange}
          />

          <Field
            label="Gender"
            name="gender"
            value={profile.gender}
            editing={false}
            onChange={handleChange}
          />

          <Field
            label="Hospital"
            name="hospital"
            value={profile.hospital}
            editing={false}
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

        {/* Upload Section */}
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
