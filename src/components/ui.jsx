import { cloneElement, useEffect, useId, useRef } from "react";
import { AlertTriangle, Ban, CheckCircle2, ChevronLeft, ChevronRight, Clock, Inbox, Loader2, Truck, UserCheck, CalendarClock, X } from "lucide-react";
import { useCountUp } from "../hooks/useUi";

export function Button({ variant = "primary", size = "md", loading = false, icon: Icon, children, className = "", ...props }) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <Loader2 size={16} className="spin" aria-hidden="true" /> : Icon && <Icon size={16} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Field({ label, error, hint, children }) {
  const id = useId();
  return (
    <div className={`field ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-err` : undefined })}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && (
        <p className="field-error" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}

const STATUS_META = {
  Pending: { cls: "warning", icon: Clock },
  Scheduled: { cls: "info", icon: CalendarClock },
  Assigned: { cls: "indigo", icon: UserCheck },
  "In Progress": { cls: "active", icon: Truck },
  Completed: { cls: "success", icon: CheckCircle2 },
  Cancelled: { cls: "danger", icon: Ban },
};

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.Pending;
  const Icon = meta.icon;
  return (
    <span className={`badge badge-${meta.cls}`}>
      <Icon size={13} aria-hidden="true" />
      {status}
    </span>
  );
}

export const statusClass = (status) => (STATUS_META[status] || STATUS_META.Pending).cls;

export const Skeleton = ({ height = 16, width = "100%", className = "" }) => (
  <span className={`skeleton ${className}`} style={{ height, width }} aria-hidden="true" />
);

export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="skeleton-rows" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={52} />
      ))}
    </div>
  );
}

export function EmptyState({ title, message, action, icon: Icon = Inbox }) {
  return (
    <div className="state">
      <Icon size={30} aria-hidden="true" />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "We could not load this" }) {
  return (
    <div className="state state-error" role="alert">
      <AlertTriangle size={30} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{error?.message || "Something went wrong."}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, tone = "neutral", hint }) {
  const shown = useCountUp(value);
  return (
    <div className={`stat-card tone-${tone}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{shown}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

export function Pagination({ page, pages, total, onChange }) {
  if (total === 0) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <span>
        Page {page} of {pages} · {total} {total === 1 ? "record" : "records"}
      </span>
      <div>
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page" />
        <Button variant="secondary" size="sm" icon={ChevronRight} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page" />
      </div>
    </nav>
  );
}

export function Modal({ title, onClose, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.open && dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
    >
      <div className="modal-card">
        <header>
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </dialog>
  );
}

export function ConfirmDialog({ title, message, confirmLabel, loading, onConfirm, onClose, danger = true }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep as is
          </Button>
          <Button variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
