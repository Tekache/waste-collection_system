import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { EmptyState } from "../components/ui";

export function PageSpinner() {
  return (
    <div className="page-spinner" role="status" aria-label="Loading">
      <span className="spinner" />
    </div>
  );
}

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

export function RequireRole({ roles }) {
  const { user } = useAuth();
  if (!roles.includes(user.role)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="You do not have access to this page"
        message="Your account role does not include this section. Use the menu to open a page you can access."
      />
    );
  }
  return <Outlet />;
}
