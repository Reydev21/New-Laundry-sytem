const statusColor = (status) => {
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

export default function OrderCard({ order, onPrint }) {
  const paid = order.paymentStatus === "PAID";
  return (
    <div className="cu-order-card">
      <div className="cu-order-head">
        <span className="cu-order-number">{order.orderNumber}</span>
        <span className="cu-badge" style={{ background: statusColor(order.orderStatus) }}>
          {order.orderStatus}
        </span>
      </div>
      <div className="cu-order-body">
        <div><strong>Service:</strong> {order.service?.serviceName} ({order.weight} kg)</div>
        <div><strong>Clothes:</strong> {order.colorType || "Colored"}</div>
        <div>
          <strong>Total:</strong> ₱{order.totalAmount?.toFixed(2)} ·{" "}
          <span style={{ color: paid ? "#059669" : "#dc2626", fontWeight: 600 }}>{order.paymentStatus}</span>
        </div>
      </div>
      {onPrint && (
        <div className="cu-order-foot">
          <button className="cu-btn-ghost" onClick={() => onPrint(order)}>Print Receipt</button>
        </div>
      )}
    </div>
  );
}
