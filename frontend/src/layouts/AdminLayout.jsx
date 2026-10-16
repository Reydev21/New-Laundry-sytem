import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout, getCurrentUser } from "../services/authService";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";
import {
  IconDashboard,
  IconOrders,
  IconCustomers,
  IconPayments,
  IconSettings,
  IconServices,
  IconStaff,
  IconReports,
  IconShield,
  IconLogout,
} from "../components/icons";

export default function AdminLayout() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  // Enable 15-minute inactivity auto logout (Requirement 3)
  useInactivityTimeout();

  const handleLogout = async () => {
    await logout();
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
          <NavLink to="/admin" end><IconDashboard /> Dashboard</NavLink>
          <NavLink to="/admin/orders"><IconOrders /> Orders</NavLink>
          <NavLink to="/admin/customers"><IconCustomers /> Customers</NavLink>
          <NavLink to="/admin/payments"><IconPayments /> Payments</NavLink>
          <NavLink to="/admin/settings"><IconSettings /> Settings</NavLink>

          {/* ADMIN ONLY PAGES (Requirement 10 - RBAC) */}
          {role === "admin" && (
            <>
              <NavLink to="/admin/services"><IconServices /> Services</NavLink>
              <NavLink to="/admin/staff"><IconStaff /> Staff</NavLink>
              <NavLink to="/admin/reports"><IconReports /> Reports</NavLink>
              <NavLink to="/admin/audit-logs"><IconShield /> Audit &amp; Security Logs</NavLink>
            </>
          )}
        </nav>
        <button onClick={handleLogout}><IconLogout /> Logout</button>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}