import { Navigate } from "react-router-dom";

export default function RoleProtectedRoute({ children, allowedRole, role: legacyRole }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const requiredRole = allowedRole || legacyRole;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
