import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout, getCurrentUser } from "../services/authService";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";
import { IconDashboard, IconBook, IconOrders, IconTrack, IconLogout } from "../components/icons";

export default function CustomerLayout() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  useInactivityTimeout();

  const handleLogout = async () => {
    await logout();
    navigate("/customer/login");
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <h2>LaundriTrack</h2>
        <p className="user-info">{user?.name || "Customer"}</p>
        <nav>
          <NavLink to="/customer/dashboard" end><IconDashboard /> Overview</NavLink>
          <NavLink to="/customer/book"><IconBook /> Book Laundry</NavLink>
          <NavLink to="/customer/orders"><IconOrders /> My Orders</NavLink>
          <NavLink to="/track"><IconTrack /> Track Laundry</NavLink>
        </nav>
        <button onClick={handleLogout}><IconLogout /> Logout</button>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
