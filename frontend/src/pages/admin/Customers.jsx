import { useEffect, useState } from "react";
import {
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
} from "../../services/customerService";
import SearchBar from "../../components/SearchBar";

const EMPTY_FORM = { name: "", phone: "", address: "", email: "" };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => getCustomers(search).then(setCustomers);

  useEffect(() => { load(); }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateCustomer(editingId, form);
      } else {
        await createCustomer(form);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      setError("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c) => {
    setEditingId(c._id);
    setForm({ name: c.name, phone: c.phone, address: c.address || "", email: c.email || "" });
    setShowForm(true);
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this customer?")) return;
    try {
      await deleteCustomer(id);
      setError("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete customer");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
        <button onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setError(""); setShowForm(true); }}>
          + Add Customer
        </button>
      </div>
      <SearchBar value={search} onChange={setSearch} placeholder="Search by name or phone" />
      {error && <p className="error" role="alert">{error}</p>}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal customer-modal">
            <h2>{editingId ? "Edit Customer" : "Add Customer"}</h2>
            <form onSubmit={handleSubmit} className="stacked-form">
              <label>Name<input placeholder="Name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
              <label>Phone<input placeholder="Phone" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label>
              <label>Address<input placeholder="Address" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
              <label>Email<input type="email" placeholder="Email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              <div className="modal-actions">
                <button type="button" onClick={cancelEdit}>Cancel</button>
                <button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Save Changes" : "Save Customer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Phone</th><th>Address</th><th>Email</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c._id}>
              <td>{c.name}</td>
              <td>{c.phone}</td>
              <td>{c.address}</td>
              <td>{c.email}</td>
              <td>
                <button onClick={() => startEdit(c)}>Edit</button>{" "}
                <button onClick={() => handleDelete(c._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
