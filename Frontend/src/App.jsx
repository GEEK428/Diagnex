import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyCode from "./pages/VerifyCode";
import ResetPassword from "./pages/ResetPassword";
import Unauthorized from "./pages/Unauthorized";

import Dashboard from "./pages/Dashboard";
import CodeSearch from "./pages/CodeSearch";
import DoctorSearch from "./pages/DoctorSearch";
import CodeSystems from "./pages/CodeSystems";
import Mappings from "./pages/Mappings";
import ConceptRequests from "./pages/ConceptRequests";
import AdminImport from "./pages/AdminImport";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMappings from "./pages/AdminMappings";
import AdminConceptRequests from "./pages/AdminConceptRequests";
import AdminMlFeedback from "./pages/AdminMlFeedback";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import AppLayout from "./layout/AppLayout";

function DashLanding() {
  const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  if (!token) return <Navigate to="/login" replace />;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role === "ADMIN" ? <AdminDashboard /> : <Dashboard />;
  } catch {
    return <Dashboard />;
  }
}

function SearchLanding() {
  const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  if (!token) return <Navigate to="/login" replace />;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role === "ADMIN" ? <CodeSearch /> : <DoctorSearch />;
  } catch {
    return <DoctorSearch />;
  }
}

export default function App() {
  const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");

  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/" element={<Navigate to={token ? "/app" : "/login"} replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* App (Protected + Layout) */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashLanding />} />
          <Route path="search" element={<SearchLanding />} />
          <Route
            path="systems"
            element={
              <RoleRoute allowedRoles={["ADMIN"]}>
                <CodeSystems />
              </RoleRoute>
            }
          />
          <Route path="mappings" element={<Mappings />} />
          <Route path="concept-requests" element={<ConceptRequests />} />
          <Route
            path="admin/dashboard"
            element={
              <RoleRoute allowedRoles={["ADMIN"]}>
                <AdminDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="admin"
            element={
              <RoleRoute allowedRoles={["ADMIN"]}>
                <AdminImport />
              </RoleRoute>
            }
          />
          <Route
            path="admin/mappings"
            element={
              <RoleRoute allowedRoles={["ADMIN"]}>
                <AdminMappings />
              </RoleRoute>
            }
          />
          <Route
            path="admin/concept-requests"
            element={
              <RoleRoute allowedRoles={["ADMIN"]}>
                <AdminConceptRequests />
              </RoleRoute>
            }
          />
          <Route
            path="admin/ml-feedback"
            element={
              <RoleRoute allowedRoles={["ADMIN"]}>
                <AdminMlFeedback />
              </RoleRoute>
            }
          />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}
