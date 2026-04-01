import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import "./AppLayout.css";

export default function AppLayout() {
  return (
    <>
      <Header />
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
