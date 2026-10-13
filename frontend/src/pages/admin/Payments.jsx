import { useEffect, useState } from "react";
import { getPayments } from "../../services/paymentService";
import SearchBar from "../../components/SearchBar";
import StatusBadge from "../../components/StatusBadge";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [range, setRange] = useState("newest");
  const [search, setSearch] = useState("");

  const load = async () => {
    setPayments(await getPayments(range));
  };
  useEffect(() => { load(); }, [range]);

  const filteredPayments = payments.filter((payment) => {
    const query = search.trim().toLowerCase();
    return !query || [payment.orderId?.orderNumber, payment.orderId?.customerId?.name]
      .some((value) => value?.toLowerCase().includes(query));
  });

  return (
    <div>
      <div className="page-header">
        <h1>Payment History</h1>
        <select aria-label="Filter payment history by date" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="last3days">Last 3 Days</option>
          <option value="last7days">Last 7 Days</option>
          <option value="last30days">Last 30 Days</option>
          <option value="all">All</option>
        </select>
      </div>
      <div className="payment-history-search">
        <SearchBar value={search} onChange={setSearch} placeholder="Search order number or customer..." />
      </div>

      <table className="data-table">
        <thead><tr><th>Order #</th><th>Customer</th><th>Amount</th><th>Status</th><th>Method</th><th>Reference #</th><th>Date</th></tr></thead>
        <tbody>
          {filteredPayments.map((p) => (
            <tr key={p._id}>
              <td>{p.orderId?.orderNumber}</td>
              <td>{p.orderId?.customerId?.name || "-"}</td>
              <td>₱{p.amount}</td>
              <td><StatusBadge status={p.paymentStatus} /></td>
              <td>{p.paymentMethod}</td>
              <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{p.referenceNumber || "-"}</td>
              <td>{new Date(p.paymentDate).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredPayments.length === 0 && <p>No confirmed payments match this search and date range.</p>}
    </div>
  );
}
