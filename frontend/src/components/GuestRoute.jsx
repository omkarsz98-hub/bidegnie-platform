import { Navigate } from "react-router-dom";

export default function GuestRoute({ children }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (token) {
    if (role === "seller") {
      return <Navigate to="/seller/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
