import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService";

export default function ProtectedRoute({ children, allowedRoles }) {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === "customer" ? "/customer/dashboard" : "/admin"} replace />;
  }
  return children;
}