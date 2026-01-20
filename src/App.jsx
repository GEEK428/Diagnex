import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyCode from "./pages/VerifyCode";
import ResetPassword from "./pages/ResetPassword";

import Dashboard from "./pages/Dashboard";
import CodeSearch from "./pages/CodeSearch";
import CodeSystems from "./pages/CodeSystems";
import AddCodeSystem from "./pages/AddCodeSystem";
import Mappings from "./pages/Mappings";
import AdminImport from "./pages/AdminImport";

import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* App */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/search"
          element={
            <ProtectedRoute>
              <AppLayout>
                <CodeSearch />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/systems"
          element={
            <ProtectedRoute>
              <AppLayout>
                <CodeSystems />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* ✅ THIS WAS MISSING */}
        <Route
          path="/app/systems/new"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AddCodeSystem />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/mappings"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Mappings />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/admin"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AdminImport />
              </AppLayout>
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}
