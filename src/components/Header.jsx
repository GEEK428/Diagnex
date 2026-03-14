import { useState } from "react";
import ProfileMenu from "./ProfileMenu";
import { FaUserCircle } from "react-icons/fa";
import "./Header.css"; 

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="header">
      <div className="logo">⚕️ NAMASTE Terminology</div>
      <div className="profile-area">
        <span className="name">Dr. Sarah Wilson</span>
        <FaUserCircle
          size={30}
          className="profile-icon"
          onClick={() => setOpen(!open)}
        />
        {open && <ProfileMenu close={() => setOpen(false)} />}
      </div>
    </header>
  );
}
