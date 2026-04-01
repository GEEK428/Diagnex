import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Layers,
  GitCompare,
  ShieldCheck,
  Settings,
  LogOut,
  ClipboardCheck,
  BrainCircuit
} from "lucide-react";
import { logout } from "../services/authService";
import "./Sidebar.css";

/**
 * Decode the JWT payload client-side (no verification — backend handles that).
 * Returns the payload object or null if decoding fails.
 */
function getJwtPayload() {
  try {
    const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
    if (!token) return null;
    const base64 = token.split(".")[1];
    const decoded = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export default function Sidebar() {
  const navigate = useNavigate();
  const payload = getJwtPayload();
  const isAdmin = payload?.role === "ADMIN";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <NavLink to={isAdmin ? "/app/admin/dashboard" : "/app"} end className="side-item">
          <LayoutDashboard size={19} />
          <span>{isAdmin ? "Admin Dashboard" : "Dashboard"}</span>
        </NavLink>

        {!isAdmin && (
          <>
            <NavLink to="/app/search" className="side-item">
              <Search size={19} />
              <span>Code Search</span>
            </NavLink>

            <NavLink to="/app/mappings" className="side-item">
              <GitCompare size={19} />
              <span>Mappings</span>
            </NavLink>

            <NavLink to="/app/concept-requests" className="side-item">
              <ClipboardCheck size={19} />
              <span>My Requests</span>
            </NavLink>
          </>
        )}

        {/* Only visible to ADMIN users */}
        {isAdmin && (
          <>
            <NavLink to="/app/systems" className="side-item side-item-systems">
              <Layers size={19} />
              <span>Code Systems</span>
            </NavLink>
            <NavLink to="/app/admin" className="side-item side-item-admin">
              <ShieldCheck size={19} />
              <span>Admin Import</span>
            </NavLink>
            <NavLink to="/app/admin/mappings" className="side-item side-item-admin">
              <GitCompare size={19} />
              <span>Mapping Control</span>
            </NavLink>
            <NavLink to="/app/admin/concept-requests" className="side-item side-item-admin">
              <ClipboardCheck size={19} />
              <span>Concept Review</span>
            </NavLink>
            <NavLink to="/app/admin/ml-feedback" className="side-item side-item-admin">
              <BrainCircuit size={19} />
              <span>Intelligence Review</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-bottom">
        <NavLink to="/app/settings" className="side-item side-item-bottom">
          <Settings size={19} />
          <span>Settings</span>
        </NavLink>

        <button
          className="side-item side-item-bottom side-logout"
          type="button"
          onClick={handleLogout}
        >
          <LogOut size={19} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
