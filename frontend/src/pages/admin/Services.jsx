import { useEffect, useState } from "react";
import { getServices, createService, updateService } from "../../services/serviceService";

const EMPTY_FORM = { serviceName: "", description: "", price: 0, unit: "kg" };

export default function ServicesAdmin() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const load = () => getServices().then(setServices);
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateService(editingId, form);
      } else {
        await createService(form);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setError("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save service");
    }
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

  const toggleStatus = async (s) => {
    try {
      await updateService(s._id, { status: s.status === "active" ? "inactive" : "active" });
      setError("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div>
      <h1>Services</h1>
      {error && <p className="error" role="alert">{error}</p>}

      <form onSubmit={handleSubmit} className="inline-form">
        <input placeholder="Service Name" value={form.serviceName}
          onChange={(e) => setForm({ ...form, serviceName: e.target.value })} required />
        <input placeholder="Description" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input type="number" placeholder="Price" value={form.price}
          onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
        <input placeholder="Unit" value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        <button type="submit">{editingId ? "Update Service" : "Add Service"}</button>
        {editingId && (
          <button type="button" onClick={cancelEdit}>Cancel</button>
        )}
      </form>

      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Description</th><th>Price</th><th>Unit</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          {services.map((s) => (
            <tr key={s._id}>
              <td>{s.serviceName}</td>
              <td>{s.description}</td>
              <td>₱{s.price}</td>
              <td>{s.unit}</td>
              <td>{s.status}</td>
              <td>
                <button onClick={() => startEdit(s)}>Edit</button>{" "}
                <button onClick={() => toggleStatus(s)}>
                  {s.status === "active" ? "Deactivate" : "Activate"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
