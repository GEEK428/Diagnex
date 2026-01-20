import { NavLink } from "react-router-dom";
import {
  FaChartLine,
  FaSearch,
  FaCode,
  FaUpload,
} from "react-icons/fa";
import "./Sidebar.css";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink to="/app/dashboard" className="side-item">
        <FaChartLine /> Dashboard
      </NavLink>

      <NavLink to="/app/search" className="side-item">
        <FaSearch /> Code Search
      </NavLink>

      <NavLink to="/app/systems" className="side-item">
        <FaCode /> Code Systems
      </NavLink>

      <NavLink to="/app/admin" className="side-item">
        <FaUpload /> Admin Import
      </NavLink>
    </aside>
  );
}
