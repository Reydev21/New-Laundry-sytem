import { useState, useEffect } from "react";
import { getMyCustomerOrders, createCustomerOrder } from "../../services/customerPortalService";
import api from "../../services/api";
import ReceiptModal from "../../components/ReceiptModal";

export default function CustomerDashboard() {
  const [orders, setOrders] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [serviceId, setServiceId] = useState("");
  const [weight, setWeight] = useState(3);
  const [colorType, setColorType] = useState("Colored");
  const [paymentMethod, setPaymentMethod] = useState("GCash");
  const [referenceNumber, setReferenceNumber] = useState("");

  // Receipt Modal State
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [servicesRes, ordersData] = await Promise.all([
        api.get("/services"),
        getMyCustomerOrders(),
      ]);

      const activeServices = (servicesRes.data || []).filter((s) => s.status === "active");
      setServices(activeServices);
      if (activeServices.length > 0) setServiceId(activeServices[0]._id || activeServices[0].id);

      setOrders(ordersData || []);
    } catch (err) {
      setError("Failed to load laundry services or orders.");
    } finally {
      setLoading(false);
    }
  };

  const selectedService = services.find((s) => (s._id || s.id) === serviceId);
  const calculatedPrice = selectedService ? selectedService.price * Number(weight || 0) : 0;

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setBookingLoading(true);

    try {
      const res = await createCustomerOrder({
        serviceId,
        weight: Number(weight),
        colorType,
        paymentMethod,
        referenceNumber,
      });

      setMessage(res.message || "Order placed successfully!");
      setReferenceNumber("");
      
      const updatedOrders = await getMyCustomerOrders();
      setOrders(updatedOrders || []);

      if (res.order) {
        setSelectedReceiptOrder(res.order);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to place order.");
    } finally {
      setBookingLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "Claimed":
      case "PAID":
        return "#059669";
      case "Ready for Pickup":
        return "#2563eb";
      case "Washing":
      case "Drying":
      case "Folding":
        return "#d97706";
      default:
        return "#4b5563";
    }
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "2rem auto", padding: "1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: "bold", color: "#0f172a" }}>Customer Laundry Dashboard</h1>
        <p style={{ color: "#64748b" }}>Book a new laundry batch, select clothes color, and pay online via GCash</p>
      </div>

      {message && <div style={{ backgroundColor: "#f0fdf4", color: "#166534", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", border: "1px solid #bbf7d0" }}>{message}</div>}
      {error && <div style={{ backgroundColor: "#fef2f2", color: "#991b1b", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", border: "1px solid #fecaca" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* ORDER BOOKING FORM */}
        <div style={{ backgroundColor: "#ffffff", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.25rem", color: "#1e293b" }}>Book Laundry Service</h2>
          
          <form onSubmit={handleBookingSubmit}>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.375rem" }}>Select Service</label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                style={{ width: "100%", padding: "0.625rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              >
                {services.map((s) => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.serviceName} - ₱{s.price}/{s.unit}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.375rem" }}>Clothes Selection (Color Type)</label>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {["Colored", "White", "Mixed"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setColorType(type)}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: colorType === type ? "2px solid #2563eb" : "1px solid #cbd5e1",
                      backgroundColor: colorType === type ? "#eff6ff" : "#ffffff",
                      color: colorType === type ? "#1d4ed8" : "#475569",
                      fontWeight: colorType === type ? "bold" : "normal",
                      cursor: "pointer",
                    }}
                  >
                    {type === "Colored" ? "🎨 Colored" : type === "White" ? "⚪ White / Light" : "🔄 Mixed Batch"}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.375rem" }}>Estimated Weight (in Kilograms / kg)</label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setWeight(Math.max(1, weight - 1))}
                  style={{ width: "40px", height: "40px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", fontWeight: "bold", cursor: "pointer" }}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  style={{ width: "80px", padding: "0.5rem", textAlign: "center", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
                <button
                  type="button"
                  onClick={() => setWeight(weight + 1)}
                  style={{ width: "40px", height: "40px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#f8fafc", fontWeight: "bold", cursor: "pointer" }}
                >
                  +
                </button>
                <span style={{ fontWeight: "bold", color: "#2563eb", fontSize: "1.1rem", marginLeft: "auto" }}>
                  Total: ₱{calculatedPrice.toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.375rem" }}>Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: "100%", padding: "0.625rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
              >
                <option value="GCash">GCash (Online Payment)</option>
                <option value="Maya">Maya (Online Payment)</option>
                <option value="Bank Transfer">Bank Transfer (Online)</option>
                <option value="Cash">Cash on Pickup</option>
              </select>
            </div>

            {["GCash", "Maya", "Bank Transfer"].includes(paymentMethod) && (
              <div style={{ backgroundColor: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1.25rem" }}>
                <p style={{ fontSize: "0.8rem", color: "#475569", marginBottom: "0.5rem" }}>
                  <strong>{paymentMethod} Merchant No:</strong> 0917-888-9999 (LaundriTrack Shop)
                </p>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.25rem" }}>Payment Reference Number</label>
                <input
                  type="text"
                  placeholder="Enter 13-digit Reference #"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  required={paymentMethod !== "Cash"}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={bookingLoading}
              style={{ width: "100%", padding: "0.75rem", backgroundColor: "#2563eb", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
            >
              {bookingLoading ? "Submitting Order..." : "Confirm & Book Laundry"}
            </button>
          </form>
        </div>

        {/* MY ORDERS LIST & TRACKER */}
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.25rem", color: "#1e293b" }}>My Laundry Orders ({orders.length})</h2>
          
          {loading ? (
            <p>Loading orders...</p>
          ) : orders.length === 0 ? (
            <p style={{ color: "#64748b" }}>You haven't placed any laundry orders yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {orders.map((o) => (
                <div key={o._id || o.id} style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: "bold", fontSize: "1.1rem", color: "#1e293b" }}>{o.orderNumber}</span>
                    <span style={{ padding: "0.25rem 0.625rem", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold", color: "#ffffff", backgroundColor: getStatusBadgeColor(o.orderStatus) }}>
                      {o.orderStatus}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: "0.875rem", color: "#475569", marginBottom: "0.75rem" }}>
                    <div><strong>Service:</strong> {o.service?.serviceName} ({o.weight} kg)</div>
                    <div><strong>Clothes Batch:</strong> {o.colorType || "Colored"}</div>
                    <div><strong>Total:</strong> ₱{o.totalAmount?.toFixed(2)} (<span style={{ color: o.paymentStatus === "PAID" ? "#059669" : "#dc2626", fontWeight: "bold" }}>{o.paymentStatus}</span>)</div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed #e2e8f0", paddingTop: "0.5rem" }}>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      Status: <strong>{o.orderStatus}</strong>
                    </div>
                    <button
                      onClick={() => setSelectedReceiptOrder(o)}
                      style={{
                        padding: "0.3rem 0.6rem",
                        backgroundColor: "#f1f5f9",
                        color: "#2563eb",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      🖨️ Print Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {selectedReceiptOrder && (
        <ReceiptModal
          order={selectedReceiptOrder}
          onClose={() => setSelectedReceiptOrder(null)}
        />
      )}
    </div>
  );
}
