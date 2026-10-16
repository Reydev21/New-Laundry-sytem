import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyCustomerOrders } from "../../services/customerPortalService";
import { getCurrentUser } from "../../services/authService";
import OrderCard from "../../components/OrderCard";

export default function CustomerDashboard() {
  const user = getCurrentUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyCustomerOrders()
      .then((data) => setOrders(data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const active = orders.filter((o) => !["Claimed", "PAID"].includes(o.orderStatus));
  const ready = orders.filter((o) => o.orderStatus === "Ready for Pickup");
  const recent = orders.slice(0, 3);
  const firstName = (user?.name || "").split(" ")[0];

  return (
    <div className="cu-page">
      <div className="cu-page-header">
        <div>
          <h1>Hi, {firstName || "there"}</h1>
          <p className="cu-muted">Welcome back to your laundry dashboard.</p>
        </div>
        <Link className="cu-btn-primary" to="/customer/book">Book Laundry</Link>
      </div>

      <div className="cu-stats">
        <div className="cu-stat"><h3>{orders.length}</h3><p>Total Orders</p></div>
        <div className="cu-stat"><h3>{active.length}</h3><p>In Progress</p></div>
        <div className="cu-stat"><h3>{ready.length}</h3><p>Ready for Pickup</p></div>
      </div>

      <h2 className="cu-section-title">Recent Orders</h2>
      {loading ? (
        <p className="cu-muted">Loading…</p>
      ) : recent.length === 0 ? (
        <div className="cu-empty">
          <p>You haven't placed any laundry orders yet.</p>
          <Link className="cu-btn-primary" to="/customer/book">Book your first batch</Link>
        </div>
      ) : (
        <>
          <div className="cu-order-list">
            {recent.map((o) => <OrderCard key={o._id || o.id} order={o} />)}
          </div>
          <p className="cu-more">
            <Link to="/customer/orders">View all orders →</Link>
          </p>
        </>
      )}
    </div>
  );
}
