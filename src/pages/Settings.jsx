import { useState, useEffect } from "react";
import "./Settings.css";

export default function Settings() {
  const [dark, setDark] = useState(
    localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    document.body.classList.toggle("dark-mode", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div className="settings-page">
      <h2>Settings</h2>

      <div className="settings-card">
        <div className="setting-row">
          <div>
            <div className="setting-title">Dark Mode</div>
            <div className="setting-desc">
              Toggle application theme
            </div>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={dark}
              onChange={() => setDark(!dark)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="setting-row">
          <div>
            <div className="setting-title">Security</div>
            <div className="setting-desc">
              Change your account password
            </div>
          </div>

          <button className="icon-btn">
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
}
