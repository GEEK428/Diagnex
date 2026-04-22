import { useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import "./AppLayout.css";

export default function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      <Header toggleMobileMenu={toggleMobileMenu} />
      <div className="app-shell">
        <Sidebar isOpen={isMobileMenuOpen} closeMenu={closeMobileMenu} />
        <main className="app-main" onClick={closeMobileMenu}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
