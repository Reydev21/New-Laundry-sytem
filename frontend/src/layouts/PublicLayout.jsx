import { Link, Outlet, useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/authService";
import { useInactivityTimeout } from "../hooks/useInactivityTimeout";

export default function PublicLayout() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  useInactivityTimeout();

  const handleLogout = async () => {
    const wasCustomer = getCurrentUser()?.role === "customer";
    await logout();
    navigate(wasCustomer ? "/customer/login" : "/login");
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
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: "bold", color: "#2563eb", textDecoration: "none" }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20a7 7 0 0 1 14 0" />
                </svg>
                {user.name} ({user.role === "customer" ? "My Dashboard" : user.role.toUpperCase()})
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