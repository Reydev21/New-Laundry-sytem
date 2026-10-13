import { useEffect, useState } from "react";
import { getDashboardStats } from "../../services/reportService";
import StatusBadge from "../../components/StatusBadge";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading dashboard...</p>;
  if (!stats) return <p>Failed to load stats.</p>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stat-grid">
        <div className="stat-card"><h3>{stats.todayOrders}</h3><p>Today's Orders</p></div>
        <div className="stat-card"><h3>{stats.pendingOrders}</h3><p>Pending</p></div>
        <div className="stat-card"><h3>{stats.readyOrders}</h3><p>Ready for Pickup</p></div>
        <div className="stat-card"><h3>{stats.claimedOrders}</h3><p>Claimed</p></div>
        <div className="stat-card"><h3>₱{stats.todaySales}</h3><p>Today's Sales</p></div>
      </div>

      <h2 style={{ marginTop: "2rem" }}>Recent Orders</h2>
      <table className="data-table">
        <thead>
          <tr><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th></tr>
        </thead>
        <tbody>
          {stats.recentOrders.map((o) => (
            <tr key={o._id}>
              <td>{o.orderNumber}</td>
              <td>{o.customerId?.name}</td>
              <td>₱{o.totalAmount}</td>
              <td><StatusBadge status={o.orderStatus} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}