import { useState } from "react";
import { trackOrder } from "../../services/orderService";
import StatusBadge from "../../components/StatusBadge";

export default function TrackLaundry() {
  const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  const handleTrack = async (e) => {
    e.preventDefault();
    setError("");
    setOrder(null);
    try {
      const data = await trackOrder(orderNumber.trim());
      setOrder(data);
    } catch {
      setError("Order not found. Please check the order number.");
    }
  };

  return (
    <div className="track-page">
      <section className="track-intro">
        <p className="eyebrow">Order status</p>
        <h1>Track your laundry</h1>
        <p className="track-lede">Enter your order number to see the latest update on your clothes.</p>
      </section>

      <section className="track-panel" aria-label="Track an order">
        <form className="track-form" onSubmit={handleTrack}>
          <label htmlFor="order-number">Order number</label>
          <div className="track-controls">
            <input
              id="order-number"
              placeholder="e.g. LAUNDRY-1025"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              required
            />
            <button type="submit">Find order</button>
          </div>
        </form>

        {error && <p className="error" role="alert">{error}</p>}

        {order && (
          <div className="order-card">
            <div className="order-card-heading">
              <div>
                <p className="eyebrow">Order found</p>
                <h2>{order.orderNumber}</h2>
              </div>
              <StatusBadge status={order.orderStatus} />
            </div>
            <div className="order-details">
              <p><span>Customer</span><strong>{order.customerId?.name || "-"}</strong></p>
              <p><span>Service</span><strong>{order.serviceId?.serviceName || "-"}</strong></p>
              <p><span>Weight</span><strong>{order.weight} kg</strong></p>
              <p><span>Total</span><strong>₱{order.totalAmount}</strong></p>
              <p><span>Payment</span><strong>{order.paymentStatus}</strong></p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}