import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createCustomerOrder } from "../../services/customerPortalService";
import api from "../../services/api";
import ReceiptModal from "../../components/ReceiptModal";

export default function CustomerBook() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [weight, setWeight] = useState(3);
  const [colorType, setColorType] = useState("Colored");
  const [paymentMethod, setPaymentMethod] = useState("GCash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);

  const loadServices = async (isRetry = false) => {
    if (!isRetry) setLoading(true);
    setError("");
    try {
      const res = await api.get("/services");
      const active = (res.data || []).filter((s) => s.status === "active");
      setServices(active);
      if (active.length > 0) {
        setServiceId(active[0]._id || active[0].id);
      } else {
        setServiceId("");
      }
    } catch (err) {
      const detail = err.response?.data?.message || err.message || "Network error";
      console.error("[CustomerBook] Failed to load services:", err);
      setError(`Failed to load laundry services. ${detail}.`);
    } finally {
      if (!isRetry) setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const selectedService = services.find((s) => (s._id || s.id) === serviceId);
  const total = selectedService ? selectedService.price * Number(weight || 0) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!serviceId) {
      setError("Please select a service to continue.");
      return;
    }
    setLoading(true);
    try {
      const res = await createCustomerOrder({
        serviceId,
        weight: Number(weight),
        colorType,
        paymentMethod,
        referenceNumber,
      });
      setMessage("Order placed successfully!");
      setReferenceNumber("");
      if (res.order) setReceipt(res.order);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to place order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cu-page cu-page-narrow">
      <div className="cu-page-header">
        <div>
          <h1>Book Laundry</h1>
          <p className="cu-muted">Choose a service, set the weight, and confirm your order.</p>
        </div>
      </div>

      {message && <div className="cu-alert cu-alert-ok">{message}</div>}
      {error && (
        <div className="cu-alert cu-alert-err" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadServices(true)}
            disabled={loading}
            style={{ padding: "0.4rem 0.85rem", borderRadius: "6px", border: "1px solid #fecaca", background: "#fff", color: "#991b1b", font: "inherit", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {loading ? "Retrying…" : "Retry"}
          </button>
        </div>
      )}

      <div className="cu-card">
        <form className="cu-form" onSubmit={handleSubmit}>
          <div>
            <label className="cu-label" htmlFor="cu-service">Select Service</label>
            <select id="cu-service" className="cu-select" value={serviceId} onChange={(e) => setServiceId(e.target.value)} disabled={services.length === 0}>
              {services.length === 0 ? (
                <option value="">No active services available</option>
              ) : (
                services.map((s) => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.serviceName} - ₱{s.price}/{s.unit}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="cu-label">Clothes Selection (Color Type)</label>
            <div className="cu-choice-row">
              {["Colored", "White", "Mixed"].map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`cu-choice${colorType === type ? " active" : ""}`}
                  onClick={() => setColorType(type)}
                >
                  {type === "Colored" ? "Colored" : type === "White" ? "White / Light" : "Mixed Batch"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="cu-label">Estimated Weight (in Kilograms / kg)</label>
            <div className="cu-weight-row">
              <button type="button" className="cu-step" onClick={() => setWeight(Math.max(1, weight - 1))}>−</button>
              <input
                type="number"
                min="1"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="cu-weight-input"
              />
              <button type="button" className="cu-step" onClick={() => setWeight(weight + 1)}>+</button>
              <span className="cu-total">Total: ₱{total.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="cu-label" htmlFor="cu-payment">Payment Method</label>
            <select id="cu-payment" className="cu-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="GCash">GCash (Online Payment)</option>
              <option value="Maya">Maya (Online Payment)</option>
              <option value="Bank Transfer">Bank Transfer (Online)</option>
              <option value="Cash">Cash on Pickup</option>
            </select>
          </div>

          {["GCash", "Maya", "Bank Transfer"].includes(paymentMethod) && (
            <div className="cu-note">
              <p><strong>{paymentMethod} Merchant No:</strong> 0917-888-9999 (LaundriTrack Shop)</p>
              <label className="cu-label" htmlFor="cu-ref">Payment Reference Number</label>
              <input
                id="cu-ref"
                type="text"
                className="cu-input"
                placeholder="Enter 13-digit Reference #"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                required={paymentMethod !== "Cash"}
              />
            </div>
          )}

          <button type="submit" className="cu-btn-primary cu-btn-block" disabled={loading || !serviceId}>
            {loading ? "Submitting Order..." : "Confirm & Book Laundry"}
          </button>
        </form>
      </div>

      {receipt && (
        <ReceiptModal
          order={receipt}
          onClose={() => { setReceipt(null); navigate("/customer/orders"); }}
        />
      )}
    </div>
  );
}
