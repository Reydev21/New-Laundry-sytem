import { useEffect, useState } from "react";
import { getUsers, getInviteCode, createUser, updateUser, deleteUser } from "../../services/userService";
import useActionReauth from "../../hooks/useActionReauth";

const EMPTY_FORM = { name: "", email: "", password: "", role: "staff" };

export default function Staff() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const { confirm, modal } = useActionReauth();

  const load = () => getUsers().then(setUsers);
  useEffect(() => {
    load();
    getInviteCode().then((data) => setInviteCode(data.inviteCode)).catch(() => {});
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    confirm(async (reauthToken) => {
      try {
        if (editingId) {
          const payload = { name: form.name, email: form.email, role: form.role };
          if (form.password) payload.password = form.password;
          await updateUser(editingId, payload, reauthToken);
          setNotice("Staff account updated.");
        } else {
          const created = await createUser(form, reauthToken);
          setNotice(
            created.emailSent
              ? `Account created. A confirmation OTP email was sent to ${created.email}.`
              : "Account created, but the email could not be sent. Check the backend console for details."
          );
        }
        setError("");
        resetForm();
        load();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to save staff account");
      }
    });
  };

  const startEdit = (user) => {
    setEditingId(user._id);
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
    setError("");
    setNotice("");
  };

  const handleDelete = (user) => {
    confirm(async (reauthToken) => {
      try {
        await deleteUser(user._id, reauthToken);
        setError("");
        setNotice("Staff account deleted.");
        if (editingId === user._id) resetForm();
        load();
      } catch (err) {
        setError(err.response?.data?.message || "Failed to delete staff account");
      }
    });
  };

  return (
    <div>
      <h1>Staff & Admin Accounts</h1>
      <p style={{ color: "#4f6155", marginTop: "-0.5rem" }}>
        Creating, editing, or deleting an account requires an email OTP confirmation (2FA).
      </p>

      {error && <p className="error" role="alert">{error}</p>}
      {notice && <div className="reauth-message">{notice}</div>}

      <div className="card" style={{ marginBottom: "1rem" }}>
        <strong>Signup Invite Code</strong>
        <p style={{ margin: "0.35rem 0 0", color: "#4f6155" }}>
          Share this code with new staff or admins so they can use <em>Create Account</em> on the
          login page. They still confirm their email with an OTP.
        </p>
        <p style={{ fontSize: "1.6rem", fontWeight: "bold", letterSpacing: "0.15em", margin: "0.5rem 0 0" }}>
          {inviteCode || "—"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="inline-form">
        <input placeholder="Full Name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input type="email" placeholder="Email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input type="password" placeholder={editingId ? "New Password (optional)" : "Password"} value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingId} />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit">{editingId ? "Update Account" : "Add Account"}</button>
        {editingId && (
          <button type="button" onClick={resetForm}>Cancel</button>
        )}
      </form>
      <p style={{ margin: "0.5rem 0 1rem", color: "#6d7d7a", fontSize: "0.8rem" }}>
        Passwords must be at least 8 chars with uppercase, lowercase, number, &amp; special char.
      </p>

      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>2FA</th><th>Action</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.isTwoFactorEnabled ? "Enabled" : "Disabled"}</td>
              <td>
                <button onClick={() => startEdit(u)}>Edit</button>{" "}
                <button onClick={() => handleDelete(u)}>Delete</button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", color: "#6b7280" }}>No accounts yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      {modal}
    </div>
  );
}
