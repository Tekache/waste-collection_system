import { Link } from "react-router-dom";
import { CalendarDays, ClipboardList, PlusCircle } from "lucide-react";
import { Button, EmptyState, ErrorState, PageHeader, Skeleton, StatCard, StatusBadge } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../context/AuthContext";
import { dashboardService } from "../services";
import { STATUSES, isStaff } from "../utils/constants";
import { formatDate } from "../utils/format";

const BAR_COLOR = { Pending: "var(--warning)", Scheduled: "var(--info)", Assigned: "var(--indigo)", "In Progress": "var(--active)", Completed: "var(--success)", Cancelled: "var(--danger)" };

function DashboardSkeleton() {
  return (
    <div className="stack">
      <div className="stat-grid">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={104} />)}</div>
      <Skeleton height={140} />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const staff = isStaff(user);
  const { data, error, loading, reload } = useAsync(dashboardService.stats, []);

  const actions = staff ? (
    <Link to="/requests"><Button icon={ClipboardList}>Review requests</Button></Link>
  ) : (
    <Link to="/requests/new"><Button icon={PlusCircle}>New request</Button></Link>
  );

  return (
    <>
      <PageHeader title={`Hello, ${user.full_name.split(" ")[0]}`} subtitle={staff ? "Here is where collections stand right now." : "Here is the latest on your collection requests."} actions={actions} />
      {loading && !data ? <DashboardSkeleton /> : error ? <ErrorState error={error} onRetry={reload} title="We could not load the overview" /> : <Body data={data} staff={staff} role={user.role} />}
    </>
  );
}

function Body({ data, staff, role }) {
  const c = data.counts;
  const active = c.Scheduled + c.Assigned + c["In Progress"];
  return (
    <div className="stack">
      <div className="stat-grid">
        <StatCard label="All requests" value={data.total} />
        <StatCard label={staff ? "Waiting to be scheduled" : "Pending review"} value={c.Pending} tone="warning" />
        <StatCard label="Scheduled or underway" value={active} tone="info" />
        <StatCard label="Completed" value={c.Completed} tone="success" />
        {role === "personnel" && <StatCard label="My open tasks" value={data.my_open_tasks} tone="active" hint="Assigned to you" />}
      </div>

      <section className="card">
        <h2>Request status overview</h2>
        {data.total === 0 ? (
          <p className="muted">No requests yet, so there is nothing to chart.</p>
        ) : (
          <>
            <div className="status-bar" role="img" aria-label={STATUSES.map((s) => `${s}: ${c[s]}`).join(", ")}>
              {STATUSES.filter((s) => c[s] > 0).map((s) => (
                <span key={s} style={{ flexGrow: c[s], background: BAR_COLOR[s] }} title={`${s}: ${c[s]}`} />
              ))}
            </div>
            <ul className="legend">
              {STATUSES.map((s) => (
                <li key={s}><i style={{ background: BAR_COLOR[s] }} />{s} <strong>{c[s]}</strong></li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div className="two-col">
        <section className="card">
          <h2>Upcoming collections</h2>
          {data.upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nothing scheduled ahead" message={staff ? "Scheduled collections will appear here." : "Once personnel schedule your request, the date shows up here."} />
          ) : (
            <ul className="list">
              {data.upcoming.map((r) => (
                <li key={r.id}>
                  <Link to={`/requests/${r.id}`}>
                    <div><strong>{formatDate(r.schedule.scheduled_date)}</strong><span>{r.schedule.time_window} · {r.collection_address}</span></div>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2>Recent requests</h2>
          {data.recent.length === 0 ? (
            <EmptyState title="No requests yet" message={staff ? "Resident requests will appear here." : "Submit your first collection request to get started."} action={!staff && <Link to="/requests/new"><Button>Create request</Button></Link>} />
          ) : (
            <ul className="list">
              {data.recent.map((r) => (
                <li key={r.id}>
                  <Link to={`/requests/${r.id}`}>
                    <div><strong>{r.reference}</strong><span>{r.collection_address}</span></div>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
