import { useNavigate } from "react-router-dom";
import { FaUser, FaCog, FaSignOutAlt } from "react-icons/fa";
import "./ProfileMenu.css";

export default function ProfileMenu({ close }) {
  const navigate = useNavigate();

  const go = (path) => {
    close();
    navigate(path);
  };
  const logout = () => {
    localStorage.removeItem("jwt");
    close();
    navigate("/");
  };
  return (
    <div className="profile-menu">
      <div className="menu-item" onClick={() => go("/app/profile")}>
        <FaUser /> Profile
      </div>

      <div className="menu-item" onClick={() => go("/app/settings")}>
        <FaCog /> Settings
      </div>

      <div className="menu-item danger" onClick={logout}>
        <FaSignOutAlt /> Logout
      </div>
    </div>
  );
}
