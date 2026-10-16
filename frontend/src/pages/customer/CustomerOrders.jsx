import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyCustomerOrders } from "../../services/customerPortalService";
import OrderCard from "../../components/OrderCard";
import ReceiptModal from "../../components/ReceiptModal";

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);

  useEffect(() => {
    getMyCustomerOrders()
      .then((data) => setOrders(data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="cu-page">
      <div className="cu-page-header">
        <div>
          <h1>My Orders</h1>
          <p className="cu-muted">
            {orders.length} order{orders.length === 1 ? "" : "s"} in total.
          </p>
        </div>
        <Link className="cu-btn-primary" to="/customer/book">Book Laundry</Link>
      </div>

      {loading ? (
        <p className="cu-muted">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="cu-empty">
          <p>You haven't placed any laundry orders yet.</p>
          <Link className="cu-btn-primary" to="/customer/book">Book your first batch</Link>
        </div>
      ) : (
        <div className="cu-order-list">
          {orders.map((o) => (
            <OrderCard key={o._id || o.id} order={o} onPrint={setSelectedReceiptOrder} />
          ))}
        </div>
      )}

      {selectedReceiptOrder && (
        <ReceiptModal
          order={selectedReceiptOrder}
          onClose={() => setSelectedReceiptOrder(null)}
        />
      )}
    </div>
  );
}
