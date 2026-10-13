// frontend/src/components/AdminRoute.jsx
import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService";

export default function AdminRoute({ children }) {
  const user = getCurrentUser();
  
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/admin" replace />;

  return children;
}