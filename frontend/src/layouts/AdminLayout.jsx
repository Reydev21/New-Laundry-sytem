import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout, getCurrentUser } from "../services/authService";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";

export default function AdminLayout() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  // Enable 15-minute inactivity auto logout (Requirement 3)
  useInactivityTimeout();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const role = user?.role || "staff";

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <h2>LaundriTrack</h2>
        <p className="user-info">
          {user?.name} ({role.toUpperCase()})
        </p>
        <nav>
          <NavLink to="/admin" end>Dashboard</NavLink>
          <NavLink to="/admin/orders">Orders</NavLink>
          <NavLink to="/admin/customers">Customers</NavLink>
          <NavLink to="/admin/payments">Payments</NavLink>
          <NavLink to="/admin/settings">Settings</NavLink>

          {/* ADMIN ONLY PAGES (Requirement 10 - RBAC) */}
          {role === "admin" && (
            <>
              <NavLink to="/admin/services">Services</NavLink>
              <NavLink to="/admin/reports">Reports</NavLink>
              <NavLink to="/admin/audit-logs">Audit & Security Logs</NavLink>
            </>
          )}
        </nav>
        <button onClick={handleLogout}>Logout</button>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}