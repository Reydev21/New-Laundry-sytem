import { getCurrentUser } from "../../services/authService";

export default function Settings() {
  const user = getCurrentUser();

  return (
    <div>
      <h1>Settings</h1>

      <div className="card">
        <h3>Account</h3>
        <div className="order-details">
          <p><span>Name</span><strong>{user?.name || "-"}</strong></p>
          <p><span>Email</span><strong>{user?.email || "-"}</strong></p>
          <p><span>Role</span><strong>{(user?.role || "staff").toUpperCase()}</strong></p>
        </div>
      </div>
    </div>
  );
}
