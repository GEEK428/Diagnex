import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Select from "react-select";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { User, Users, Mail, Building, Briefcase, FileText, Lock, Clock } from "lucide-react";
import { getPasswordStrength } from "../utils/passwordStrength";
import { completeGoogleRegistration, register } from "../services/authService";
import AuthSplitLayout from "../components/AuthSplitLayout";
import "./Login.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const HOSPITAL_OPTIONS = [
  "AIIMS Delhi",
  "Apollo Hospitals",
  "Fortis Healthcare",
  "Medanta",
  "Mayo Clinic",
  "Cleveland Clinic",
  "Johns Hopkins Hospital",
  "NHS",
  "King's College Hospital"
];

const GLASS_SELECT = {
  control: (base, state) => ({
    ...base,
    minHeight: 34,
    height: 34,
    backgroundColor: "#f7faf8",
    borderColor: state.isFocused ? "#6c9e7a" : "#d1e0d7",
    borderWidth: "1px",
    borderRadius: 8,
    boxShadow: state.isFocused ? "0 0 0 3px rgba(108,158,122,0.15)" : "none",
    fontSize: 11.5,
    transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
    "&:hover": { borderColor: "#b8ccbf" }
  }),
  valueContainer: (base) => ({ ...base, height: 34, padding: "0 10px 0 32px" }),
  indicatorsContainer: (base) => ({ ...base, height: 34 }),
  singleValue: (base) => ({ ...base, color: "#1a2e24" }),
  placeholder: (base) => ({ ...base, color: "#a4bba8", fontSize: 11.5 }),
  input: (base) => ({ ...base, color: "#1a2e24" }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    border: "1px solid #d1e0d7",
    boxShadow: "0 4px 12px rgba(34,63,47,0.1)",
    fontSize: 11.5,
    zIndex: 99
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "rgba(163,189,144,0.15)" : "transparent",
    color: "#1a2e24",
    borderRadius: 6,
    margin: "2px 4px",
    width: "calc(100% - 8px)",
    cursor: "pointer"
  })
};

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    name: "",
    gender: "",
    email: "",
    hospital: "",
    hospitalOther: "",
    role: "DOCTOR",
    license: "",
    adminEmail: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const googleSetup = location.state?.googleSetup || null;
  const isGoogleCompletion = Boolean(googleSetup?.setupToken && googleSetup?.prefill);

  useEffect(() => {
    if (!isGoogleCompletion) return;
    setForm((prev) => ({
      ...prev,
      name: googleSetup.prefill.name || "",
      email: googleSetup.prefill.email || "",
      password: googleSetup.prefill.password || ""
    }));
  }, [googleSetup, isGoogleCompletion]);

  const hospitalOptions = useMemo(
    () => [
      ...HOSPITAL_OPTIONS.map((h) => ({ label: h, value: h })),
      { label: "Other", value: "Other" }
    ],
    []
  );

  const strength = getPasswordStrength(form.password);

  const validate = (candidate = form, nextTouched = touched, force = false) => {
    const errs = {};
    if (!candidate.name.trim()) errs.name = "Required";
    if (!candidate.gender) errs.gender = "Required";
    if (!candidate.email.trim()) errs.email = "Required";
    else if (!EMAIL_REGEX.test(candidate.email.trim())) errs.email = "Invalid email format";
    if (!candidate.hospital) errs.hospital = "Required";
    if (candidate.hospital === "Other" && !candidate.hospitalOther.trim()) errs.hospitalOther = "Required";
    if (!candidate.role) errs.role = "Required";
    if (!candidate.license.trim()) errs.license = "Required";
    // Admin email required only for DOCTOR role
    if (candidate.role === "DOCTOR") {
      if (!candidate.adminEmail.trim()) errs.adminEmail = "Required for Doctor accounts";
      else if (!EMAIL_REGEX.test(candidate.adminEmail.trim())) errs.adminEmail = "Enter a valid admin email";
    }

    if (!isGoogleCompletion) {
      if (!candidate.password) errs.password = "Required";
      else if (strength < 4) errs.password = "Password too weak";
    }

    if (force) {
      setErrors(errs);
      return Object.keys(errs).length === 0;
    }

    const filtered = {};
    const keys = [
      "name",
      "gender",
      "email",
      "hospital",
      "hospitalOther",
      "role",
      "license",
      "adminEmail",
      "password"
    ];
    for (const key of keys) {
      if (nextTouched[key] && errs[key]) filtered[key] = errs[key];
    }
    setErrors(filtered);
    return Object.keys(errs).length === 0;
  };

  const updateField = (key, value) => {
    const next = { ...form, [key]: value };
    const nextTouched = { ...touched, [key]: true };
    setForm(next);
    setTouched(nextTouched);
    validate(next, nextTouched);
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setServerError("");
    const allTouched = {
      name: true,
      gender: true,
      email: true,
      hospital: true,
      hospitalOther: true,
      role: true,
      license: true,
      adminEmail: true,
      password: true
    };
    setTouched(allTouched);
    if (!validate(form, allTouched, true)) return;
    setLoading(true);

    try {
      if (isGoogleCompletion) {
        const result = await completeGoogleRegistration({
          setupToken: googleSetup.setupToken,
          role: form.role,
          gender: form.gender,
          hospital: form.hospital === "Other" ? form.hospitalOther.trim() : form.hospital,
          address: "",
          name: form.name.trim(),
          licenseNumber: form.license.trim(),
          adminEmail: form.role === "DOCTOR" ? form.adminEmail.trim() : undefined
        });

        if (result.token) {
          localStorage.setItem("jwt", result.token);
          sessionStorage.removeItem("jwt");
          navigate("/app");
        } else {
          setIsPendingApproval(true);
          setSuccessMessage(result.message);
        }
        return;
      }

      const result = await register({
        name: form.name.trim(),
        gender: form.gender,
        email: form.email.trim(),
        hospital: form.hospital === "Other" ? form.hospitalOther.trim() : form.hospital,
        address: "",
        role: form.role,
        licenseNumber: form.license.trim(),
        adminEmail: form.role === "DOCTOR" ? form.adminEmail.trim() : undefined,
        password: form.password
      });

      if (form.role === "DOCTOR") {
        setIsPendingApproval(true);
        setSuccessMessage(result); // result is the string from backend
      } else {
        navigate("/login");
      }
    } catch (err) {
      setServerError(err.response?.data || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (isPendingApproval) {
    return (
      <AuthSplitLayout>
        <div className="reg-card p-5 text-center" style={{ maxWidth: "450px", margin: "auto" }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%", background: "#f0fdf4",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px"
          }}>
            <Clock size={40} color="#166534" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a2c24", marginBottom: 12 }}>Registration Submitted</h1>
          <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 32 }}>
            {successMessage || "Your professional registration has been securely submitted. Please wait for your administrator to verify and approve your account."}
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate("/login")}
            style={{ width: "100%", padding: "12px", background: "#166534", border: "none", borderRadius: 8, fontWeight: 700 }}
          >
            Return to Login
          </button>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout>
      <div className="reg-card vertical-scroll-card">
        <div className="reg-card-header">
          <h1 className="reg-title">Create Account</h1>
          <p className="reg-subtitle">
            {isGoogleCompletion
              ? "Confirm your professional details to complete your registration. Your email is from Google and cannot be changed."
              : "Complete details to create your account"}
          </p>
        </div>

        <div className="reg-form-scroll">
          <form onSubmit={handleRegister} noValidate>
            {serverError && <div className="alert alert-danger mb-2">{serverError}</div>}

            <div className="reg-grid tight">
              <div className="reg-field">
                <label className="form-label">Full Name</label>
                <div className="input-icon-wrapper">
                  <User className="input-icon" size={14} />
                  <input
                    className={`form-control with-left-icon${errors.name ? " border-danger" : ""}`}
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Dr. Jane Smith"
                  />
                </div>
                {errors.name && <div className="text-danger mt-1">{errors.name}</div>}
              </div>

              <div className="reg-field">
                <label className="form-label">Gender</label>
                <div className="input-icon-wrapper">
                  <Users className="input-icon" size={14} />
                  <select
                    className={`form-control with-left-icon${errors.gender ? " border-danger" : ""}`}
                    value={form.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                {errors.gender && <div className="text-danger mt-1">{errors.gender}</div>}
              </div>

              <div className="reg-field">
                <label className="form-label">Professional Email</label>
                <div className="input-icon-wrapper">
                  <Mail className="input-icon" size={14} />
                  <input
                    type="email"
                    className={`form-control with-left-icon${errors.email ? " border-danger" : ""}`}
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="name@hospital.org"
                    autoComplete="email"
                    readOnly={isGoogleCompletion}
                  />
                </div>
                {errors.email && <div className="text-danger mt-1">{errors.email}</div>}
              </div>

              <div className="reg-field">
                <label className="form-label">Hospital / Organization</label>
                <div className="input-icon-wrapper">
                  <Building className="input-icon" size={14} style={{ zIndex: 100 }} />
                  <Select
                    options={hospitalOptions}
                    value={form.hospital ? { label: form.hospital, value: form.hospital } : null}
                    onChange={(opt) => updateField("hospital", opt.value)}
                    styles={GLASS_SELECT}
                    placeholder="Select hospital"
                  />
                </div>
                {errors.hospital && <div className="text-danger mt-1">{errors.hospital}</div>}
                {form.hospital === "Other" && (
                  <div className="input-icon-wrapper mt-2">
                    <Building className="input-icon" size={14} />
                    <input
                      className={`form-control with-left-icon${errors.hospitalOther ? " border-danger" : ""}`}
                      value={form.hospitalOther}
                      onChange={(e) => updateField("hospitalOther", e.target.value)}
                      placeholder="Enter organization name"
                    />
                    {errors.hospitalOther && <div className="text-danger mt-1">{errors.hospitalOther}</div>}
                  </div>
                )}
              </div>

              <div className="reg-field">
                <label className="form-label">Role</label>
                <div className="input-icon-wrapper">
                  <Briefcase className="input-icon" size={14} />
                  <select
                    className={`form-control with-left-icon${errors.role ? " border-danger" : ""}`}
                    value={form.role}
                    onChange={(e) => updateField("role", e.target.value)}
                  >
                    <option value="DOCTOR">Doctor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                {errors.role && <div className="text-danger mt-1">{errors.role}</div>}
              </div>

              {/* Admin Email — only shown for Doctor role */}
              {form.role === "DOCTOR" && (
                <div className="reg-field reg-field-full">
                  <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "8px 12px",
                    background: "rgba(108,158,122,0.08)",
                    border: "1px solid rgba(108,158,122,0.25)",
                    borderRadius: 8,
                    marginBottom: 8,
                    fontSize: 11.5,
                    color: "#2b4c3b",
                    lineHeight: 1.5
                  }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}>🔗</span>
                    <span>Doctor accounts must be connected to an administrator. Enter your admin's registered email below to link your account.</span>
                  </div>
                  <label className="form-label">Admin's Email</label>
                  <div className="input-icon-wrapper">
                    <Mail className="input-icon" size={14} />
                    <input
                      type="email"
                      className={`form-control with-left-icon${errors.adminEmail ? " border-danger" : ""}`}
                      value={form.adminEmail}
                      onChange={(e) => updateField("adminEmail", e.target.value)}
                      placeholder="admin@hospital.org"
                      autoComplete="off"
                    />
                  </div>
                  {errors.adminEmail && <div className="text-danger mt-1">{errors.adminEmail}</div>}
                </div>
              )}

              <div className="reg-field">
                <label className="form-label">Medical License</label>
                <div className="input-icon-wrapper">
                  <FileText className="input-icon" size={14} />
                  <input
                    className={`form-control with-left-icon${errors.license ? " border-danger" : ""}`}
                    value={form.license}
                    onChange={(e) => updateField("license", e.target.value)}
                    placeholder="License Number"
                  />
                </div>
                {errors.license && <div className="text-danger mt-1">{errors.license}</div>}
              </div>

              <div className="reg-field reg-field-full">
                <label className="form-label">Password</label>
                <div className="password-field input-icon-wrapper">
                  <Lock className="input-icon" size={14} />
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`form-control with-left-icon with-icon${errors.password ? " border-danger" : ""}`}
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    readOnly={isGoogleCompletion}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide" : "Show"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {form.password && !isGoogleCompletion && (
                  <>
                    <div className="progress mt-1" style={{ height: "4px" }}>
                      <div
                        className={`progress-bar ${
                          strength <= 2 ? "bg-danger" : strength <= 3 ? "bg-warning" : "bg-success"
                        }`}
                        style={{ width: `${(strength / 5) * 100}%` }}
                      />
                    </div>
                    <div className="hint mt-1">
                      {strength < 5 ? "Use uppercase, lowercase, number & symbol" : "Strong password"}
                    </div>
                  </>
                )}
                {errors.password && <div className="text-danger mt-1">{errors.password}</div>}
              </div>
            </div>

            <div className="reg-actions">
              <button type="submit" className="reg-submit-btn" disabled={loading}>
                {loading
                  ? isGoogleCompletion
                    ? "Completing registration..."
                    : "Creating account..."
                  : "Complete Registration"}
              </button>
            </div>

            {!isGoogleCompletion && (
              <div className="reg-bottom-links">
                Already registered?{" "}
                <button type="button" className="register-link" onClick={() => navigate("/login")}>
                  Log in
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
