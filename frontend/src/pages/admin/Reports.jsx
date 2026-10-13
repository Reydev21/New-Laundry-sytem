import { useEffect, useState } from "react";
import { getOrders } from "../../services/orderService";
import { getPayments } from "../../services/paymentService";

export default function Reports() {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  useEffect(() => {
    getOrders().then(setOrders);
    getPayments().then(setPayments);
  }, []);

  const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = totalSales - totalCollected;
  const claimed = orders.filter((o) => o.orderStatus === "Claimed").length;
  const pending = orders.filter((o) =>
    ["Received", "Washing", "Drying", "Folding"].includes(o.orderStatus)
  ).length;
  const paid = orders.filter((o) => o.paymentStatus === "PAID").length;
  const partially = orders.filter((o) => o.paymentStatus === "PARTIALLY PAID").length;
  const unpaid = orders.filter((o) => o.paymentStatus === "UNPAID").length;

  return (
    <div>
      <h1>Reports</h1>

      <h2>Sales Summary</h2>
      <div className="stat-grid">
        <div className="stat-card"><h3>₱{totalSales}</h3><p>Total Sales (All Orders)</p></div>
        <div className="stat-card"><h3>₱{totalCollected}</h3><p>Total Collected (Payments)</p></div>
        <div className="stat-card"><h3>₱{outstanding}</h3><p>Outstanding Balance</p></div>
      </div>

      <h2>Order Summary</h2>
      <div className="stat-grid">
        <div className="stat-card"><h3>{orders.length}</h3><p>Total Orders</p></div>
        <div className="stat-card"><h3>{pending}</h3><p>Pending Orders</p></div>
        <div className="stat-card"><h3>{claimed}</h3><p>Claimed Orders</p></div>
      </div>

      <h2>Payment Summary</h2>
      <div className="stat-grid">
        <div className="stat-card"><h3>{paid}</h3><p>Fully Paid Orders</p></div>
        <div className="stat-card"><h3>{partially}</h3><p>Partially Paid Orders</p></div>
        <div className="stat-card"><h3>{unpaid}</h3><p>Unpaid Orders</p></div>
      </div>
    </div>
  );
}
