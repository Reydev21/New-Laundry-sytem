import { Link, Outlet, useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/authService";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";

export default function PublicLayout() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  useInactivityTimeout();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="public-shell">
      <nav className="navbar">
        <Link to="/" className="brand" aria-label="LaundriTrack home">
          <span className="brand-mark">LT</span>
          <span>LaundriTrack</span>
        </Link>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/services">Services</Link>
          <Link to="/track">Track Laundry</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginLeft: "0.5rem" }}>
              <Link
                to={user.role === "admin" || user.role === "staff" ? "/admin" : "/customer/dashboard"}
                style={{ fontWeight: "bold", color: "#2563eb", textDecoration: "none" }}
              >
                👤 {user.name} ({user.role === "customer" ? "My Dashboard" : user.role.toUpperCase()})
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  background: "transparent",
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                  borderRadius: "4px",
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link to="/customer/login" className="nav-login">Customer Portal</Link>
          )}
        </div>
      </nav>
      <main className="container public-main">
        <Outlet />
      </main>
      <footer className="public-footer">Clean clothes, clear updates.</footer>
    </div>
  );
}