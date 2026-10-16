import { useState, useEffect } from "react";
import api from "../../services/api";

export default function AuditLogs() {
  const [activeTab, setActiveTab] = useState("activity"); // "activity" or "financial"
  const [auditLogs, setAuditLogs] = useState([]);
  const [transactionLogs, setTransactionLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [backupStatus, setBackupStatus] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const [auditRes, transRes] = await Promise.all([
        api.get("/logs/audit-logs"),
        api.get("/logs/transaction-logs"),
      ]);
      setAuditLogs(auditRes.data || []);
      setTransactionLogs(transRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch security logs");
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerBackup = async () => {
    setBackupStatus("Creating backup...");
    try {
      const res = await api.post("/logs/backups/trigger");
      setBackupStatus(`Backup created: ${res.data.filename}`);
      setTimeout(() => setBackupStatus(""), 5000);
    } catch (err) {
      setBackupStatus("Backup creation failed.");
    }
  };

  const handleReset = () => {
    setSearch("");
    fetchLogs();
  };

  const query = search.trim().toLowerCase();
  const matches = (values) =>
    !query || values.some((value) => String(value ?? "").toLowerCase().includes(query));

  const visibleAuditLogs = auditLogs.filter((log) =>
    matches([log.userName, log.userRole, log.action, log.resource, log.ipAddress, log.details])
  );
  const visibleTransactionLogs = transactionLogs.filter((t) =>
    matches([t.type, t.paymentMethod, t.paymentStatus, t.reference, t.createdBy, t.amount])
  );

  return (
    <div className="audit-logs-page" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "bold" }}>Security & Audit Trails</h1>
          <p style={{ color: "#6b7280" }}>Activity Audit Logs, Financial Transaction Logs, and Automated Backups</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs…"
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #cbd5e1",
              borderRadius: "0.375rem",
              minWidth: "200px",
            }}
          />
          <button
            onClick={handleReset}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#ffffff",
              color: "#4b5563",
              border: "1px solid #cbd5e1",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Reset
          </button>
          <button
            onClick={fetchLogs}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#ffffff",
              color: "#2563eb",
              border: "1px solid #cbd5e1",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Refresh
          </button>
          <button
            onClick={handleTriggerBackup}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              borderRadius: "0.375rem",
              border: "none",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Trigger Instant DB Backup
          </button>
          {backupStatus && <span style={{ color: "#059669", fontSize: "0.875rem" }}>{backupStatus}</span>}
        </div>
      </div>

      {error && <div style={{ color: "#dc2626", marginBottom: "1rem" }}>{error}</div>}

      <div style={{ display: "flex", gap: "1rem", borderBottom: "2px solid #e5e7eb", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setActiveTab("activity")}
          style={{
            padding: "0.75rem 1rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "activity" ? "3px solid #2563eb" : "none",
            fontWeight: activeTab === "activity" ? "bold" : "normal",
            color: activeTab === "activity" ? "#2563eb" : "#4b5563",
            cursor: "pointer",
          }}
        >
          Activity Audit Trails ({visibleAuditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab("financial")}
          style={{
            padding: "0.75rem 1rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "financial" ? "3px solid #2563eb" : "none",
            fontWeight: activeTab === "financial" ? "bold" : "normal",
            color: activeTab === "financial" ? "#2563eb" : "#4b5563",
            cursor: "pointer",
          }}
        >
          Financial Transaction Logs ({visibleTransactionLogs.length})
        </button>
      </div>

      {loading ? (
        <p>Loading security logs...</p>
      ) : activeTab === "activity" ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "0.75rem" }}>Timestamp</th>
                <th style={{ padding: "0.75rem" }}>User</th>
                <th style={{ padding: "0.75rem" }}>Role</th>
                <th style={{ padding: "0.75rem" }}>Action</th>
                <th style={{ padding: "0.75rem" }}>Resource</th>
                <th style={{ padding: "0.75rem" }}>IP Address</th>
                <th style={{ padding: "0.75rem" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {visibleAuditLogs.map((log) => (
                <tr key={log._id || log.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "0.75rem" }}>{new Date(log.createdAt).toLocaleString()}</td>
                  <td style={{ padding: "0.75rem", fontWeight: "600" }}>{log.userName || "System"}</td>
                  <td style={{ padding: "0.75rem" }}>{log.userRole || "-"}</td>
                  <td style={{ padding: "0.75rem", color: "#1d4ed8", fontWeight: "500" }}>{log.action}</td>
                  <td style={{ padding: "0.75rem" }}>{log.resource}</td>
                  <td style={{ padding: "0.75rem", fontFamily: "monospace" }}>{log.ipAddress}</td>
                  <td style={{ padding: "0.75rem", maxWidth: "300px", wordBreak: "break-word" }}>{log.details}</td>
                </tr>
              ))}
              {visibleAuditLogs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "1.5rem", textAlign: "center", color: "#6b7280" }}>
                    {query ? "No activity audit logs match your search." : "No activity audit logs recorded yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "0.75rem" }}>Timestamp</th>
                <th style={{ padding: "0.75rem" }}>Type</th>
                <th style={{ padding: "0.75rem" }}>Amount</th>
                <th style={{ padding: "0.75rem" }}>Method</th>
                <th style={{ padding: "0.75rem" }}>Status</th>
                <th style={{ padding: "0.75rem" }}>Reference</th>
                <th style={{ padding: "0.75rem" }}>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {visibleTransactionLogs.map((t) => (
                <tr key={t._id || t.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "0.75rem" }}>{new Date(t.createdAt).toLocaleString()}</td>
                  <td style={{ padding: "0.75rem", fontWeight: "600", color: "#047857" }}>{t.type}</td>
                  <td style={{ padding: "0.75rem", fontWeight: "bold" }}>₱{t.amount?.toFixed(2)}</td>
                  <td style={{ padding: "0.75rem" }}>{t.paymentMethod}</td>
                  <td style={{ padding: "0.75rem" }}>{t.paymentStatus}</td>
                  <td style={{ padding: "0.75rem", fontFamily: "monospace" }}>{t.reference}</td>
                  <td style={{ padding: "0.75rem" }}>{t.createdBy}</td>
                </tr>
              ))}
              {visibleTransactionLogs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "1.5rem", textAlign: "center", color: "#6b7280" }}>
                    {query ? "No financial transaction logs match your search." : "No financial transaction logs recorded yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
