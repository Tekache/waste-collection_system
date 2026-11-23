import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Recycle } from "lucide-react";
import { Button, Field } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

function AuthShell({ title, subtitle, footer, children }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="brand">
          <Recycle size={22} aria-hidden="true" /> Waste Collection
        </Link>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
        <p className="auth-foot">{footer}</p>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const found = {};
    if (!/^\S+@\S+\.\S+$/.test(values.email)) found.email = "Enter a valid email address.";
    if (!values.password) found.password = "Enter your password.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await login(values);
      toast.success("Signed in successfully.");
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      setErrors({ form: err.message });
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Sign in" subtitle="Track your collection requests or manage today's pickups." footer={<>New here? <Link to="/register">Create a resident account</Link></>}>
      <form onSubmit={submit} className="form-grid" noValidate>
        {errors.form && <div className="form-alert" role="alert">{errors.form}</div>}
        <Field label="Email" error={errors.email}>
          <input type="email" autoComplete="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
        </Field>
        <Field label="Password" error={errors.password}>
          <input type="password" autoComplete="current-password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />
        </Field>
        <Button type="submit" loading={busy}>Sign in</Button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [values, setValues] = useState({ full_name: "", email: "", phone: "", address: "", password: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setValues({ ...values, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const found = {};
    if (values.full_name.trim().length < 2) found.full_name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(values.email)) found.email = "Enter a valid email address.";
    if (values.password.length < 8) found.password = "Use at least 8 characters.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await register({ ...values, phone: values.phone || null, address: values.address || null });
      toast.success("Your account is ready.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setErrors(err.fields && Object.keys(err.fields).length ? err.fields : { form: err.message });
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Residents can request collections and follow their progress." footer={<>Already registered? <Link to="/login">Sign in</Link></>}>
      <form onSubmit={submit} className="form-grid" noValidate>
        {errors.form && <div className="form-alert" role="alert">{errors.form}</div>}
        <Field label="Full name" error={errors.full_name}><input value={values.full_name} onChange={set("full_name")} autoComplete="name" /></Field>
        <Field label="Email" error={errors.email}><input type="email" value={values.email} onChange={set("email")} autoComplete="email" /></Field>
        <Field label="Phone (optional)" error={errors.phone}><input type="tel" value={values.phone} onChange={set("phone")} autoComplete="tel" /></Field>
        <Field label="Home address (optional)" error={errors.address}><input value={values.address} onChange={set("address")} autoComplete="street-address" /></Field>
        <Field label="Password" error={errors.password} hint="At least 8 characters."><input type="password" value={values.password} onChange={set("password")} autoComplete="new-password" /></Field>
        <Button type="submit" loading={busy}>Create account</Button>
      </form>
    </AuthShell>
  );
}
