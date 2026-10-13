import React from "react";

export default function ReceiptModal({ order, onClose }) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const customerName = order.customerId?.name || order.customer?.name || "Customer";
  const customerPhone = order.customerId?.phone || order.customer?.phone || "-";
  const serviceName = order.serviceId?.serviceName || order.service?.serviceName || "Laundry Service";
  const colorType = order.colorType || "Colored";

  return (
    <div className="receipt-modal-overlay" style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    }}>
      <div className="receipt-card" style={{
        backgroundColor: "#ffffff",
        width: "360px",
        padding: "1.5rem",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        fontFamily: "Courier, monospace, sans-serif",
      }}>
        {/* Printable Area */}
        <div id="printable-receipt" style={{ padding: "0.5rem" }}>
          <div style={{ textAlign: "center", borderBottom: "1px dashed #94a3b8", paddingBottom: "0.75rem", marginBottom: "0.75rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>LaundriTrack</h2>
            <p style={{ margin: "0.2rem 0", fontSize: "0.75rem", color: "#64748b" }}>Clean Clothes & Real-Time Tracking</p>
            <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: "bold" }}>RECEIPT / INVOICE</p>
          </div>

          <div style={{ fontSize: "0.8rem", lineHeight: "1.4", marginBottom: "0.75rem", borderBottom: "1px dashed #94a3b8", paddingBottom: "0.75rem" }}>
            <div><strong>Order #:</strong> {order.orderNumber}</div>
            <div><strong>Date:</strong> {new Date(order.createdAt || Date.now()).toLocaleString()}</div>
            <div><strong>Customer:</strong> {customerName}</div>
            {customerPhone && <div><strong>Phone:</strong> {customerPhone}</div>}
          </div>

          <div style={{ fontSize: "0.8rem", lineHeight: "1.4", marginBottom: "0.75rem", borderBottom: "1px dashed #94a3b8", paddingBottom: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Service:</span>
              <span><strong>{serviceName}</strong></span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Batch Color:</span>
              <span><strong>{colorType}</strong></span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Weight:</span>
              <span><strong>{order.weight} kg</strong></span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Rate:</span>
              <span>₱{order.pricePerKg || 0}/kg</span>
            </div>
          </div>

          <div style={{ fontSize: "0.9rem", fontWeight: "bold", display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", borderBottom: "1px dashed #94a3b8", paddingBottom: "0.75rem" }}>
            <span>TOTAL AMOUNT:</span>
            <span>₱{Number(order.totalAmount || 0).toFixed(2)}</span>
          </div>

          <div style={{ fontSize: "0.8rem", lineHeight: "1.4", marginBottom: "1rem" }}>
            <div><strong>Payment Status:</strong> {order.paymentStatus || "UNPAID"}</div>
            <div><strong>Order Status:</strong> {order.orderStatus || "Received"}</div>
          </div>

          <div style={{ textAlign: "center", fontSize: "0.7rem", color: "#64748b" }}>
            Thank you for choosing LaundriTrack!
          </div>
        </div>

        {/* Action Buttons */}
        <div className="no-print" style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              padding: "0.6rem",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            🖨️ Print Receipt
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "0.6rem 1rem",
              backgroundColor: "#f1f5f9",
              color: "#475569",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Print CSS Media Query Style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
