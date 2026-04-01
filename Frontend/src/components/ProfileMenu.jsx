import { useNavigate } from "react-router-dom";
import { FaCog, FaSignOutAlt } from "react-icons/fa";
import { logout } from "../services/authService";
import "./ProfileMenu.css";

export default function ProfileMenu({ close }) {
  const navigate = useNavigate();

  const go = (path) => {
    close();
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    close();
    navigate("/login");
  };

  return (
    <div className="profile-menu">
      <div className="menu-item" onClick={() => go("/app/settings")}>
        <FaCog /> Settings
      </div>

      <div className="menu-divider" />

      <div className="menu-item logout" onClick={handleLogout}>
        <FaSignOutAlt /> Logout
      </div>
    </div>
  );
}
