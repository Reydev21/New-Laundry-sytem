const colors = {
  Received: "#888",
  Washing: "#0d6efd",
  Drying: "#fd7e14",
  Folding: "#6f42c1",
  "Ready for Pickup": "#198754",
  Claimed: "#20c997",
  UNPAID: "#f0c419",
  "PARTIALLY PAID": "#d97706",
  PAID: "#198754",
};

export default function StatusBadge({ status }) {
  return (
    <span
      style={{
        background: colors[status] || "#444",
        color: status === "UNPAID" ? "#332b00" : "white",
        padding: "2px 10px",
        borderRadius: "999px",
        fontSize: "0.8rem",
      }}
    >
      {status}
    </span>
  );
}