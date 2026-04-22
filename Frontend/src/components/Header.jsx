import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dna, Menu } from "lucide-react";
import ProfileMenu from "./ProfileMenu";
import NotificationBell from "./NotificationBell";
import { getCurrentUser } from "../services/authService";
import "./Header.css";

export default function Header({ toggleMobileMenu }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [avatarInitial, setAvatarInitial] = useState("U");
  const menuRef = useRef(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        const name = user.name || user.email || "User";
        setUserName(name);
        setAvatarInitial(name.charAt(0).toUpperCase());

        const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setIsAdmin(payload.role === "ADMIN");
        }
      } catch {
        setUserName("User");
        setAvatarInitial("U");
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="app-header">
      <div className="header-left">
        <button 
          className="mobile-menu-btn" 
          onClick={toggleMobileMenu}
          aria-label="Toggle Menu"
        >
          <Menu size={22} />
        </button>
        
        <button type="button" className="header-brand" onClick={() => navigate("/app")}>
          <span className="header-brand-icon">
            <Dna size={18} strokeWidth={2.4} />
          </span>
          <div className="header-brand-text">
            <span className="header-brand-name">Diagnex</span>
            <span className="header-brand-sub">Clinical Terminology Platform</span>
          </div>
        </button>
      </div>

      <div className="header-actions">
        {isAdmin && <NotificationBell />}

        <div className="header-avatar-wrap" ref={menuRef}>
          <button
            className="header-avatar"
            onClick={() => setOpen((prev) => !prev)}
            title={userName}
            type="button"
          >
            {avatarInitial}
          </button>
          {open && <ProfileMenu close={() => setOpen(false)} />}
        </div>
      </div>
    </header>
  );
}
