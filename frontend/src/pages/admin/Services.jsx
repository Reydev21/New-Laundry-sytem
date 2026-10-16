import { useEffect, useState } from "react";
import { getServices, createService, updateService } from "../../services/serviceService";
import useActionReauth from "../../hooks/useActionReauth";

const EMPTY_FORM = { serviceName: "", description: "", price: 0, unit: "kg" };

export default function ServicesAdmin() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const { confirm, modal } = useActionReauth();

  const load = () => getServices().then(setServices);
  useEffect(() => { load(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    confirm(async (reauthToken) => {
      try {
        if (editingId) {
          await updateService(editingId, form, reauthToken);
        } else {
          await createService(form, reauthToken);
        }
        setForm(EMPTY_FORM);
        setEditingId(null);
        setError("");
        load();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to save service");
      }
    });
  };

  const startEdit = (s) => {
    setEditingId(s._id);
    setForm({
      serviceName: s.serviceName,
      description: s.description || "",
      price: s.price,
      unit: s.unit || "kg",
    });
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const toggleStatus = (s) => {
    confirm(async (reauthToken) => {
      try {
        await updateService(s._id, { status: s.status === "active" ? "inactive" : "active" }, reauthToken);
        setError("");
        load();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to update status");
      }
    });
  };

  return (
    <div className="admin-services-page">
      <header className="admin-services-head">
        <div>
          <p className="eyebrow">Service management</p>
          <h1>Services</h1>
        </div>
      </header>

      {error && <div className="admin-services-alert" role="alert">{error}</div>}

      <section className="admin-services-form-card">
        <h2>{editingId ? "Edit Service" : "Add New Service"}</h2>
        <form className="admin-services-form" onSubmit={handleSubmit}>
          <div className="admin-services-field">
            <label htmlFor="svc-name">Service Name</label>
            <input
              id="svc-name"
              placeholder="e.g. Wash & Fold"
              value={form.serviceName}
              onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
              required
            />
          </div>
          <div className="admin-services-field">
            <label htmlFor="svc-desc">Description</label>
            <input
              id="svc-desc"
              placeholder="Short description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="admin-services-field admin-services-field-sm">
            <label htmlFor="svc-price">Price (₱)</label>
            <input
              id="svc-price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              required
            />
          </div>
          <div className="admin-services-field admin-services-field-sm">
            <label htmlFor="svc-unit">Unit</label>
            <input
              id="svc-unit"
              placeholder="e.g. kg"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              required
            />
          </div>
          <div className="admin-services-form-actions">
            <button type="submit" className="admin-services-btn-primary">
              {editingId ? "Update Service" : "Add Service"}
            </button>
            {editingId && (
              <button type="button" className="admin-services-btn-ghost" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="admin-services-table-card">
        <h2>Service List</h2>
        {services.length === 0 ? (
          <p className="admin-services-empty">No services yet. Add one above.</p>
        ) : (
          <div className="admin-services-table-wrap">
            <table className="admin-services-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Unit</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s._id}>
                    <td><strong>{s.serviceName}</strong></td>
                    <td>{s.description || "—"}</td>
                    <td>₱{s.price}</td>
                    <td>{s.unit}</td>
                    <td>
                      <span className={`admin-services-badge ${s.status === "active" ? "active" : "inactive"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <div className="admin-services-row-actions">
                        <button className="admin-services-btn-edit" onClick={() => startEdit(s)}>
                          Edit
                        </button>
                        <button
                          className={`admin-services-btn-toggle ${s.status === "active" ? "danger" : "success"}`}
                          onClick={() => toggleStatus(s)}
                        >
                          {s.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal}
    </div>
  );
}
