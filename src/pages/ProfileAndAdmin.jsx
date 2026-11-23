import { useState } from "react";
import { Save, UserPlus } from "lucide-react";
import { Button, EmptyState, ErrorState, Field, Modal, PageHeader, Pagination, SkeletonRows } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useDebounce } from "../hooks/useUi";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authService, userService } from "../services";
import { ROLES } from "../utils/constants";

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState({ full_name: user.full_name, phone: user.phone || "", address: user.address || "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setValues({ ...values, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    if (values.full_name.trim().length < 2) return setErrors({ full_name: "Enter your full name." });
    setBusy(true);
    try {
      setUser(await authService.updateProfile({ full_name: values.full_name, phone: values.phone || null, address: values.address || null }));
      setErrors({});
      toast.success("Profile updated.");
    } catch (err) {
      setErrors(err.fields && Object.keys(err.fields).length ? err.fields : { form: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Profile" subtitle={`${ROLES[user.role]} account`} />
      <section className="card narrow">
        <form className="form-grid" onSubmit={save} noValidate>
          {errors.form && <div className="form-alert" role="alert">{errors.form}</div>}
          <Field label="Email" hint="Your email is your sign-in and cannot be changed here."><input value={user.email} readOnly /></Field>
          <Field label="Full name" error={errors.full_name}><input value={values.full_name} onChange={set("full_name")} /></Field>
          <Field label="Phone" error={errors.phone}><input type="tel" value={values.phone} onChange={set("phone")} /></Field>
          <Field label="Address" error={errors.address}><input value={values.address} onChange={set("address")} /></Field>
          <div className="form-actions"><Button type="submit" icon={Save} loading={busy}>Save changes</Button></div>
        </form>
      </section>
    </>
  );
}

function CreateUserModal({ onClose, onDone }) {
  const toast = useToast();
  const [values, setValues] = useState({ full_name: "", email: "", password: "", role: "personnel", phone: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setValues({ ...values, [k]: e.target.value });

  async function save() {
    setBusy(true);
    try {
      await userService.create({ ...values, phone: values.phone || null });
      toast.success("User created.");
      onDone();
    } catch (err) {
      setErrors(err.fields && Object.keys(err.fields).length ? err.fields : { form: err.message });
      setBusy(false);
    }
  }

  return (
    <Modal title="Add user" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Create user</Button></>}>
      <div className="form-grid">
        {errors.form && <div className="form-alert" role="alert">{errors.form}</div>}
        <Field label="Full name" error={errors.full_name}><input value={values.full_name} onChange={set("full_name")} /></Field>
        <Field label="Email" error={errors.email}><input type="email" value={values.email} onChange={set("email")} /></Field>
        <Field label="Temporary password" error={errors.password} hint="At least 8 characters. Share it securely."><input type="password" value={values.password} onChange={set("password")} /></Field>
        <Field label="Role" error={errors.role}><select value={values.role} onChange={set("role")}>{Object.entries(ROLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      </div>
    </Modal>
  );
}

export function AdminUsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [filters, setFilters] = useState({ q: "", role: "" });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const q = useDebounce(filters.q);
  const { data, error, loading, reload } = useAsync(() => userService.list({ page, page_size: 10, q, role: filters.role }), [page, q, filters.role]);

  async function update(u, body, message) {
    try {
      await userService.update(u.id, body);
      toast.success(message);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <PageHeader title="Users" subtitle="Create personnel accounts and manage roles and access." actions={<Button icon={UserPlus} onClick={() => setCreating(true)}>Add user</Button>} />
      <section className="card">
        <div className="filters">
          <input type="search" placeholder="Search name or email" aria-label="Search users" value={filters.q} onChange={(e) => { setPage(1); setFilters({ ...filters, q: e.target.value }); }} />
          <select value={filters.role} onChange={(e) => { setPage(1); setFilters({ ...filters, role: e.target.value }); }} aria-label="Filter by role">
            <option value="">All roles</option>
            {Object.entries(ROLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {loading && !data ? <SkeletonRows /> : error ? <ErrorState error={error} onRetry={reload} /> : data.items.length === 0 ? <EmptyState title="No users found" message="Try a different search." /> : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th></tr></thead>
                <tbody>
                  {data.items.map((u) => {
                    const self = u.id === me.id;
                    return (
                      <tr key={u.id}>
                        <td data-label="Name"><strong>{u.full_name}</strong></td>
                        <td data-label="Email">{u.email}</td>
                        <td data-label="Role">
                          <select value={u.role} disabled={self} aria-label={`Role for ${u.full_name}`} onChange={(e) => update(u, { role: e.target.value }, "Role updated.")}>
                            {Object.entries(ROLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </td>
                        <td data-label="Access">
                          <Button size="sm" variant={u.is_active ? "secondary" : "primary"} disabled={self} onClick={() => update(u, { is_active: !u.is_active }, u.is_active ? "User deactivated." : "User reactivated.")}>{u.is_active ? "Deactivate" : "Reactivate"}</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
          </>
        )}
      </section>
      {creating && <CreateUserModal onClose={() => setCreating(false)} onDone={() => { setCreating(false); reload(); }} />}
    </>
  );
}
