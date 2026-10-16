import { useEffect, useRef, useState } from "react";
import { getOrders, createOrder, updateOrderStatus, deleteOrder } from "../../services/orderService";
import { getCustomers } from "../../services/customerService";
import { getServices } from "../../services/serviceService";
import { confirmPayment } from "../../services/paymentService";
import StatusBadge from "../../components/StatusBadge";
import SearchBar from "../../components/SearchBar";
import ReceiptModal from "../../components/ReceiptModal";
import useActionReauth from "../../hooks/useActionReauth";

const STATUSES = ["Received", "Washing", "Drying", "Folding", "Ready for Pickup", "Claimed"];
const PAYMENT_STATUSES = ["UNPAID", "PARTIALLY PAID", "PAID"];
const PAYMENT_METHODS = ["Cash", "GCash", "Maya", "Bank Transfer"];

const createPaymentId = () => Array.from(
  window.crypto.getRandomValues(new Uint8Array(12)),
  (byte) => byte.toString(16).padStart(2, "0")
).join("");

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [savingOrderIds, setSavingOrderIds] = useState({});
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);
  const savingOrdersRef = useRef(new Set());
  const { confirm, modal } = useActionReauth();

  const [form, setForm] = useState({ customerId: "", serviceId: "", weight: 1 });

  const load = async () => {
    const [o, c, s] = await Promise.all([getOrders({ search }), getCustomers(), getServices()]);
    setOrders(o); setCustomers(c); setServices(s);
  };

  useEffect(() => { load(); }, [search]);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (creatingOrder) return;
    setCreatingOrder(true);
    try {
      await createOrder(form);
      setShowForm(false);
      setForm({ customerId: "", serviceId: "", weight: 1 });
      setError("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create order");
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await updateOrderStatus(id, status);
      setError("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleDeleteOrder = (order) => {
    confirm(async (reauthToken) => {
      try {
        await deleteOrder(order._id, reauthToken);
        setError("");
        load();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to void/delete order");
      }
    });
  };

  const handleConfirmPayment = async (order) => {
    if (savingOrdersRef.current.has(order._id)) return;
    const draft = paymentDrafts[order._id] || {
      paymentStatus: order.paymentStatus,
      amount: order.paymentStatus === "UNPAID" ? 0 : "",
      paymentMethod: "Cash",
      paymentId: null,
    };
    const paymentId = draft.paymentStatus === "UNPAID" ? undefined : draft.paymentId || createPaymentId();

    if (draft.paymentStatus !== "UNPAID" && (!Number.isFinite(Number(draft.amount)) || Number(draft.amount) <= 0)) {
      setPaymentError("Amount must be greater than 0");
      return;
    }

    savingOrdersRef.current.add(order._id);
    setSavingOrderIds((current) => ({ ...current, [order._id]: true }));
    setPaymentError("");
    if (paymentId) {
      setPaymentDrafts((current) => ({ ...current, [order._id]: { ...draft, paymentId } }));
    }
    try {
      const result = await confirmPayment({
        orderId: order._id,
        amount: draft.paymentStatus === "UNPAID" ? 0 : Number(draft.amount),
        paymentStatus: draft.paymentStatus,
        paymentId,
        paymentMethod: draft.paymentMethod || "Cash",
      });
      setPaymentDrafts((current) => ({
        ...current,
        [order._id]: {
          paymentStatus: result.paymentStatus,
          amount: "",
          paymentMethod: result.paymentMethod || draft.paymentMethod || "Cash",
          paymentId: null,
        },
      }));
      setPaymentError("");
      setError("");
      await load();
    } catch (err) {
      setPaymentError(err.response?.data?.message || "Failed to record payment");
    } finally {
      savingOrdersRef.current.delete(order._id);
      setSavingOrderIds((current) => ({ ...current, [order._id]: false }));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Orders</h1>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Order"}
        </button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by order #, customer name, or phone" />
      {error && <p className="error" role="alert">{error}</p>}
      {paymentError && <p className="error" role="alert">{paymentError}</p>}

      {showForm && (
        <div className="card">
          <h2>Create Order</h2>
          <form onSubmit={handleCreateOrder} className="inline-form">
            <div className="order-field customer-field">
              <label htmlFor="order-customer">Customer</label>
              <select id="order-customer" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required>
                <option value="">Select Customer</option>
                {customers.map((c) => <option key={c._id} value={c._id}>{c.name} — {c.phone}</option>)}
              </select>
            </div>
            <div className="order-field">
              <label htmlFor="order-service">Service</label>
              <select id="order-service" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })} required>
                <option value="">Select Service</option>
                {services.filter((s) => s.status === "active").map((s) => (
                  <option key={s._id} value={s._id}>{s.serviceName} — ₱{s.price}/{s.unit}</option>
                ))}
              </select>
            </div>
            <div className="order-field weight-field">
              <label htmlFor="order-weight">Weight (kg)</label>
              <input id="order-weight" type="number" min="0.1" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} required />
            </div>
            <button type="submit" disabled={creatingOrder}>{creatingOrder ? "Creating..." : "Create Order"}</button>
          </form>
        </div>
      )}

      <div className="orders-table-wrap">
      <table className="data-table orders-table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Service</th>
            <th>Batch Color</th>
            <th>Weight (kg)</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o._id}>
              <td>{o.orderNumber}</td>
              <td>{o.customerId?.name}</td>
              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
              <td>{o.serviceId?.serviceName || "-"}</td>
              <td>
                <span style={{
                  padding: "0.2rem 0.5rem",
                  borderRadius: "12px",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                  backgroundColor: o.colorType === "White" ? "#f1f5f9" : o.colorType === "Mixed" ? "#fef3c7" : "#e0f2fe",
                  color: o.colorType === "White" ? "#334155" : o.colorType === "Mixed" ? "#b45309" : "#0369a1"
                }}>
                  {o.colorType || "Colored"}
                </span>
              </td>
              <td>{o.weight}</td>
              <td>₱{o.totalAmount}</td>
              <td>
                <StatusBadge status={o.paymentStatus} />
                <br />
                <small>Remaining: ₱{o.remainingBalance ?? o.totalAmount}</small>
              </td>
              <td><StatusBadge status={o.orderStatus} /></td>
              <td>
                {(() => {
                  const draft = paymentDrafts[o._id] || {
                    paymentStatus: o.paymentStatus,
                    amount: o.paymentStatus === "UNPAID" ? 0 : "",
                    paymentMethod: "Cash",
                    paymentId: null,
                  };
                  const updateDraft = (changes) => setPaymentDrafts((current) => ({
                    ...current,
                    [o._id]: { ...draft, ...changes, paymentId: createPaymentId() },
                  }));
                  return (
                    <div className="order-payment-controls">
                      <select aria-label={`Order status for ${o.orderNumber}`} value={o.orderStatus} onChange={(e) => handleStatus(o._id, e.target.value)}>
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <select aria-label={`Payment status for ${o.orderNumber}`} value={draft.paymentStatus} onChange={(e) => {
                        const paymentStatus = e.target.value;
                        updateDraft({
                          paymentStatus,
                          amount: paymentStatus === "UNPAID" ? 0 : paymentStatus === "PAID" ? (o.remainingBalance ?? o.totalAmount) : "",
                        });
                        setPaymentError("");
                      }}>
                        {PAYMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}
                      </select>
                      {draft.paymentStatus !== "UNPAID" && (
                        <>
                          <input
                            aria-label={`Payment amount for ${o.orderNumber}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={draft.amount}
                            onChange={(e) => updateDraft({ amount: e.target.value })}
                            placeholder="Amount"
                          />
                          <select
                            aria-label={`Payment method for ${o.orderNumber}`}
                            value={draft.paymentMethod || "Cash"}
                            onChange={(e) => updateDraft({ paymentMethod: e.target.value })}
                          >
                            {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
                          </select>
                        </>
                      )}
                      <button type="button" disabled={savingOrderIds[o._id]} onClick={() => handleConfirmPayment(o)}>
                        {savingOrderIds[o._id] ? "Confirming..." : "Confirm"}
                      </button>
                      <button type="button" style={{ backgroundColor: "#f1f5f9", color: "#2563eb", border: "1px solid #cbd5e1" }} onClick={() => setSelectedReceiptOrder(o)}>
                        🖨️ Receipt
                      </button>
                      <button type="button" style={{ backgroundColor: "#fef2f2", color: "#b42318", border: "1px solid #fecaca" }} onClick={() => handleDeleteOrder(o)}>
                        Void
                      </button>
                    </div>
                  );
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {selectedReceiptOrder && (
        <ReceiptModal
          order={selectedReceiptOrder}
          onClose={() => setSelectedReceiptOrder(null)}
        />
      )}

      {modal}
    </div>
  );
}
