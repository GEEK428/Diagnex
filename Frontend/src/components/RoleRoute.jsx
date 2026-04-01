import { Navigate } from "react-router-dom";

/**
 * Decodes a JWT payload without verifying signature (client-side only).
 * Signature is verified by the backend on every protected API call.
 */
function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1];
    const decoded = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export default function RoleRoute({ allowedRoles = [], children }) {
  const token = localStorage.getItem("jwt") || sessionStorage.getItem("jwt");
  if (!token) return <Navigate to="/login" replace />;

  const payload = decodeJwtPayload(token);
  const role = payload?.role || payload?.roles?.[0] || "";

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
