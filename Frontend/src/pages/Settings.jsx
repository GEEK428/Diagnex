import { useState, useEffect } from "react";
import { User, Lock, Shield, Save, AlertOctagon, Trash2 } from "lucide-react";
import { getCurrentUser, updateProfile, changePassword, deleteAccount } from "../services/authService";
import "./Settings.css";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    name: "",
    gender: "",
    email: "",
    phone: "",
    hospital: "",
    licenseNumber: ""
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });

  // Password Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });

  // Delete Account
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await getCurrentUser();
      setUser(data);
      setProfileForm({
        name: data.name || "",
        gender: data.gender || "",
        email: data.email || "",
        phone: data.phone || "",
        hospital: data.hospital || "",
        licenseNumber: data.licenseNumber || ""
      });
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg({ type: "", text: "" });
    try {
      await updateProfile(profileForm);
      setProfileMsg({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => setProfileMsg({ type: "", text: "" }), 3000);
      
      // If email was changed and it succeeds, they might get automatically logged out.
      // But we just re-fetch profile if still here.
      fetchProfile();
    } catch (err) {
      setProfileMsg({ type: "error", text: err.response?.data?.message || err.message || "Failed to update profile." });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return setPasswordMsg({ type: "error", text: "New passwords do not match." });
    }
    setPasswordSaving(true);
    setPasswordMsg({ type: "", text: "" });
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordMsg({ type: "success", text: "Password changed successfully!" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPasswordMsg({ type: "", text: "" }), 3000);
    } catch (err) {
      setPasswordMsg({ type: "error", text: err.response?.data?.message || err.message || "Failed to change password." });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    const confirmed = window.confirm("Are you absolutely sure you want to permanently delete your account? This action cannot be reversed.");
    if (!confirmed) return;
    
    setDeleteSaving(true);
    setDeleteMsg({ type: "", text: "" });
    try {
      await deleteAccount(isOAuth ? undefined : deletePassword);
      window.alert("Your account has been permanently deleted.");
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    } catch (err) {
      const errMsg = err.response?.data || err.message || "Failed to delete account.";
      setDeleteMsg({ type: "error", text: String(errMsg) });
      setDeleteSaving(false);
    }
  };

  const isOAuth = user?.oauthProvider === "google";

  if (loading) return <div className="set-page"><p className="set-loading">Loading configuration...</p></div>;

  return (
    <div className="set-page">
      <div className="set-header">
        <h1>Account Settings</h1>
        <p>Manage your clinical identity, security credentials, and preferences.</p>
      </div>

      <div className="set-container">
        {/* Sidebar */}
        <div className="set-sidebar">
          
          <div className="set-user-brief">
            <div className="set-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            <div className="set-brief-info">
              <span className="name">{user?.name}</span>
              <span className="role-badge"><Shield size={10} /> {user?.role || "Doctor"}</span>
            </div>
          </div>

          <div className="set-nav">
            <button className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>
              <User size={16} /> Personal Information
            </button>
            <button className={activeTab === "security" ? "active" : ""} onClick={() => setActiveTab("security")}>
              <Lock size={16} /> Security & Password
            </button>
            <button className={`danger-tab-btn ${activeTab === "danger" ? "active" : ""}`} onClick={() => setActiveTab("danger")}>
              <AlertOctagon size={16} /> Danger Zone
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="set-content">
          
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="set-panel">
              <div className="set-panel-header">
                <h3>Personal Information</h3>
                <p>Update your public identity and clinical contact details.</p>
              </div>

              {profileMsg.text && (
                <div className={`set-alert ${profileMsg.type}`}>{profileMsg.text}</div>
              )}

              <form className="set-form-grid" onSubmit={handleProfileSave}>
                <div className="set-group">
                  <label>Full Name</label>
                  <input type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} required />
                </div>
                
                <div className="set-group">
                  <label>Gender</label>
                  <select value={profileForm.gender} onChange={e => setProfileForm({...profileForm, gender: e.target.value})}>
                    <option value="">-- Unspecified --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="set-group">
                  <label>Email Address {isOAuth && <span className="locked-lbl">(Managed by Google)</span>}</label>
                  <input type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} disabled={isOAuth} required />
                </div>

                <div className="set-group">
                  <label>Phone Number</label>
                  <input type="tel" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} placeholder="+1 (555) 000-0000" />
                </div>

                <div className="set-group">
                  <label>Hospital / Clinic Name</label>
                  <input type="text" value={profileForm.hospital} onChange={e => setProfileForm({...profileForm, hospital: e.target.value})} />
                </div>

                <div className="set-group">
                  <label>Medical License Number</label>
                  <input type="text" value={profileForm.licenseNumber} onChange={e => setProfileForm({...profileForm, licenseNumber: e.target.value})} placeholder="Enter license number" />
                </div>

                <div className="set-actions">
                  <button type="submit" className="primary-btn" disabled={profileSaving}>
                    <Save size={16} /> {profileSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === "security" && (
            <div className="set-panel">
              <div className="set-panel-header">
                <h3>Security & Password</h3>
                <p>Ensure your account is using a strong, verified password.</p>
              </div>

              {isOAuth ? (
                <div className="set-empty-state">
                  <Shield size={32} opacity={0.3} />
                  <p>Your password is managed securely by Google.</p>
                </div>
              ) : (
                <>
                  {passwordMsg.text && (
                    <div className={`set-alert ${passwordMsg.type}`}>{passwordMsg.text}</div>
                  )}
                  <form className="set-form-v" onSubmit={handlePasswordSave}>
                    <div className="set-group full">
                      <label>Current Password</label>
                      <input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} required />
                    </div>
                    
                    <div className="set-group full">
                      <label>New Password</label>
                      <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} required minLength={8} />
                    </div>

                    <div className="set-group full">
                      <label>Confirm New Password</label>
                      <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} required minLength={8} />
                    </div>

                    <div className="set-actions">
                      <button type="submit" className="primary-btn" disabled={passwordSaving}>
                        <Lock size={16} /> {passwordSaving ? "Updating..." : "Change Password"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}

          {/* DANGER ZONE TAB */}
          {activeTab === "danger" && (
            <div className="set-panel">
              <div className="set-panel-header danger-header">
                <h3 style={{color: "#991b1b"}}>Danger Zone</h3>
                <p style={{color: "#dc2626"}}>Irreversible and destructive account actions.</p>
              </div>

              <div className="set-form-v">
                <div className="danger-warning-box">
                  <strong>Warning:</strong> Deleting your account is permanent. All associated data will be completely wiped from the MongoDB database, including your audit logs, concept requests, and ML tracking history.
                </div>

                {deleteMsg.text && (
                  <div className={`set-alert ${deleteMsg.type}`} style={{margin: "0 0 20px 0"}}>{deleteMsg.text}</div>
                )}

                <form onSubmit={handleDeleteAccount}>
                  {!isOAuth && (
                    <div className="set-group full" style={{ marginBottom: 20 }}>
                      <label style={{color: "#7f1d1d"}}>Security Verification Password</label>
                      <input 
                        type="password" 
                        value={deletePassword} 
                        onChange={e => setDeletePassword(e.target.value)} 
                        required 
                        placeholder="Enter your current password"
                        style={{ borderColor: "#fecaca" }}
                      />
                    </div>
                  )}

                  <button type="submit" className="danger-btn" disabled={deleteSaving}>
                    <Trash2 size={16} /> {deleteSaving ? "Deleting..." : "Permanently Delete Account"}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
