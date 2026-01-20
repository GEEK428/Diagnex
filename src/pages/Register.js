import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PhoneInput from "react-phone-input-2";
import Select from "react-select";
import { getPasswordStrength } from "../utils/passwordStrength";

import "react-phone-input-2/lib/style.css";
import "./Login.css";

export default function Register() {
  const navigate = useNavigate();

  /* 🌙 Persistent dark mode */
  const [dark, setDark] = useState(
    localStorage.getItem("theme") === "dark"
  );

  const [form, setForm] = useState({
    name: "",
    gender: "",
    email: "",
    phone: "",
    countryCode: "in", // auto-detected from phone
    hospital: "",
    hospitalOther: "",
    address: "",
    license: "",
    password: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    document.body.classList.toggle("dark-mode", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  /* 🏥 Hospitals by country (extend anytime) */
  const hospitalsByCountry = {
    in: [
      "AIIMS Delhi",
      "AIIMS Bhopal",
      "Apollo Hospitals",
      "Fortis Healthcare",
      "Medanta",
      "Tata Memorial Hospital",
    ],
    us: [
      "Mayo Clinic",
      "Cleveland Clinic",
      "Johns Hopkins Hospital",
      "Massachusetts General Hospital",
      "UCLA Medical Center",
    ],
    uk: [
      "NHS",
      "Guy’s and St Thomas’",
      "King’s College Hospital",
    ],
  };

  const hospitalOptions = [
    ...(hospitalsByCountry[form.countryCode] || []).map(
      (h) => ({ label: h, value: h })
    ),
    { label: "Other", value: "Other" },
  ];

  const strength = getPasswordStrength(form.password);

  const validate = () => {
    let errs = {};

    if (!form.name) errs.name = "Full name is required";
    if (!form.gender) errs.gender = "Gender is required";
    if (!form.email) errs.email = "Email is required";
    if (!form.phone || form.phone.length < 8)
      errs.phone = "Valid phone number required";
    if (!form.hospital)
      errs.hospital = "Hospital is required";
    if (form.hospital === "Other" && !form.hospitalOther)
      errs.hospitalOther = "Enter hospital name";
    if (!form.address) errs.address = "Address is required";
    if (!form.license) errs.license = "License number required";
    if (strength < 4) errs.password = "Password too weak";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const finalHospital =
      form.hospital === "Other"
        ? form.hospitalOther
        : form.hospital;

    console.log({
      ...form,
      hospital: finalHospital,
    });

    navigate("/");
  };

  return (
    <>
      {/* 🌙 Dark toggle */}
      <div className="theme-toggle" onClick={() => setDark(!dark)}>
        {dark ? "☀️" : "🌙"}
      </div>

      <div className="login-wrapper">
        <div className="login-card">
          <div className="text-center mb-3">
            <div className="auth-logo">⚕️</div>
            <h5 className="title">Doctor Registration</h5>
            <p className="subtitle">
              Register to access NAMASTE Terminology
            </p>
          </div>

          <form onSubmit={handleRegister} noValidate>

            {/* Full Name */}
            <label className="form-label">Full Name</label>
            <input
              className={`form-control mb-2 ${errors.name ? "is-invalid" : ""}`}
              placeholder="Dr. Rahul Sharma"
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />

            {/* Gender */}
            <label className="form-label">Gender</label>
            <select
              className={`form-control mb-2 ${errors.gender ? "is-invalid" : ""}`}
              onChange={(e) =>
                setForm({ ...form, gender: e.target.value })
              }
            >
              <option value="">Select gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>

            {/* Email */}
            <label className="form-label">Email</label>
            <input
              type="email"
              className={`form-control mb-2 ${errors.email ? "is-invalid" : ""}`}
              placeholder="doctor@hospital.ac.in"
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />

            {/* Phone (auto-detect country) */}
            <label className="form-label">Contact Number</label>
            <PhoneInput
              country={form.countryCode}
              value={form.phone}
              enableSearch
              onChange={(phone, country) =>
                setForm({
                  ...form,
                  phone,
                  countryCode: country.countryCode,
                  hospital: "",
                  hospitalOther: "",
                })
              }
              inputClass="form-control"
              containerClass="mb-2"
              inputStyle={{
                width: "100%",
                fontSize: "13px",
                background: dark ? "#24343a" : "#fff",
                color: dark ? "#e5e7eb" : "#0f172a",
              }}
              buttonStyle={{
                background: dark ? "#24343a" : "#fff",
                borderColor: dark ? "#3a4b52" : "#ced4da",
              }}
            />
            {errors.phone && (
              <div className="text-danger small mb-2">
                {errors.phone}
              </div>
            )}

            {/* Hospital */}
            <label className="form-label">Hospital / Organization</label>
            <Select
              options={hospitalOptions}
              value={
                form.hospital
                  ? { label: form.hospital, value: form.hospital }
                  : null
              }
              onChange={(opt) =>
                setForm({ ...form, hospital: opt.value })
              }
              styles={{
                control: (base) => ({
                  ...base,
                  fontSize: "13px",
                  backgroundColor: dark ? "#24343a" : "#fff",
                  borderColor: dark ? "#3a4b52" : "#ced4da",
                }),
                menu: (base) => ({
                  ...base,
                  backgroundColor: dark ? "#1e2a30" : "#fff",
                }),
                singleValue: (base) => ({
                  ...base,
                  color: dark ? "#e5e7eb" : "#0f172a",
                }),
              }}
            />
            {errors.hospital && (
              <div className="text-danger small mb-2">
                {errors.hospital}
              </div>
            )}

            {/* Other hospital */}
            {form.hospital === "Other" && (
              <input
                className={`form-control mt-2 ${
                  errors.hospitalOther ? "is-invalid" : ""
                }`}
                placeholder="Enter hospital name"
                onChange={(e) =>
                  setForm({
                    ...form,
                    hospitalOther: e.target.value,
                  })
                }
              />
            )}

            {/* Address */}
            <label className="form-label mt-2">Address</label>
            <textarea
              className={`form-control mb-2 ${errors.address ? "is-invalid" : ""}`}
              rows="2"
              placeholder="City, State"
              onChange={(e) =>
                setForm({ ...form, address: e.target.value })
              }
            />

            {/* License */}
            <label className="form-label">Medical License Number</label>
            <input
              className={`form-control mb-2 ${errors.license ? "is-invalid" : ""}`}
              placeholder="MED123456"
              onChange={(e) =>
                setForm({ ...form, license: e.target.value })
              }
            />

            {/* Password */}
            <label className="form-label">Password</label>
            <input
              type="password"
              className={`form-control mb-1 ${errors.password ? "is-invalid" : ""}`}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />

            {form.password && (
              <>
                <div className="progress mb-1" style={{ height: "5px" }}>
                  <div
                    className={`progress-bar ${
                      strength <= 2
                        ? "bg-danger"
                        : strength === 3
                        ? "bg-warning"
                        : "bg-success"
                    }`}
                    style={{ width: `${(strength / 5) * 100}%` }}
                  />
                </div>
                <div className="hint">
                  {strength <= 2 && "Weak password"}
                  {strength === 3 && "Moderate password"}
                  {strength >= 4 && "Strong password"}
                </div>
              </>
            )}

            <button className="btn login-btn w-100 mt-3">
              Register
            </button>

            <div className="text-center mt-3 small">
              Already registered?{" "}
              <span
                className="register-link"
                onClick={() => navigate("/")}
              >
                Login
              </span>
            </div>

          </form>
        </div>
      </div>
    </>
  );
}
