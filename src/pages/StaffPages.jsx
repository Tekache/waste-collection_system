import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ListChecks, Play, CheckCircle2 } from "lucide-react";
import { Button, EmptyState, ErrorState, PageHeader, Pagination, SkeletonRows, StatusBadge } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { scheduleService, taskService } from "../services";
import { addDaysISO, formatDate, formatWeekday, todayISO } from "../utils/format";

export function SchedulePage() {
  const [range, setRange] = useState({ from: todayISO(), to: addDaysISO(30) });
  const { data, error, loading, reload } = useAsync(() => scheduleService.list({ date_from: range.from, date_to: range.to, page_size: 200 }), [range.from, range.to]);

  const groups = (data?.items || []).reduce((acc, s) => {
    (acc[s.scheduled_date] ||= []).push(s);
    return acc;
  }, {});

  return (
    <>
      <PageHeader title="Collection schedule" subtitle="Active collections grouped by day." />
      <section className="card">
        <div className="filters">
          <label className="date-filter">From <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
          <label className="date-filter">To <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
        </div>
        {loading && !data ? <SkeletonRows /> : error ? <ErrorState error={error} onRetry={reload} /> : data.items.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No collections in this period" message="Schedule a pending request to see it here." action={<Link to="/requests"><Button variant="secondary">Review requests</Button></Link>} />
        ) : (
          <div className="agenda">
            {Object.entries(groups).map(([day, items]) => (
              <div key={day} className="agenda-day">
                <h3>{formatWeekday(day)}</h3>
                <ul className="list">
                  {items.map((s) => (
                    <li key={s.id}>
                      <Link to={`/requests/${s.request.id}`}>
                        <div><strong>{s.time_window} · {s.request.reference}</strong><span>{s.request.collection_address}{s.request.assignment ? ` · ${s.request.assignment.personnel_name}` : " · Unassigned"}</span></div>
                        <StatusBadge status={s.request.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export function TasksPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const { data, error, loading, reload } = useAsync(() => taskService.list({ page, page_size: 10, status }), [page, status]);

  async function move(task, next, message) {
    setBusyId(task.id);
    try {
      await taskService.update(task.id, { status: next });
      toast.success(message);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader title={user.role === "admin" ? "All tasks" : "My tasks"} subtitle="Start a pickup when you arrive and mark it completed when it is done." />
      <section className="card">
        <div className="filters">
          <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} aria-label="Filter by status">
            <option value="">All statuses</option>
            {["Assigned", "In Progress", "Completed", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        {loading && !data ? <SkeletonRows /> : error ? <ErrorState error={error} onRetry={reload} /> : data.items.length === 0 ? (
          <EmptyState icon={ListChecks} title="No tasks here" message={status ? "No tasks match this status." : "Tasks appear once a scheduled request is assigned to personnel."} />
        ) : (
          <>
            <ul className="list tasks">
              {data.items.map((t) => (
                <li key={t.id} className="task-row">
                  <div>
                    <Link to={`/requests/${t.request_id}`} className="link-strong">{t.request_reference}</Link>
                    <span>{t.request_snapshot.collection_address}</span>
                    <span>{formatDate(t.request_snapshot.scheduled_date)}, {t.request_snapshot.time_window} · {t.request_snapshot.waste_type}{user.role === "admin" ? ` · ${t.personnel_name}` : ""}</span>
                  </div>
                  <div className="task-actions">
                    <StatusBadge status={t.status} />
                    {t.status === "Assigned" && <Button size="sm" icon={Play} loading={busyId === t.id} onClick={() => move(t, "In Progress", "Collection started.")}>Start</Button>}
                    {t.status === "In Progress" && <Button size="sm" icon={CheckCircle2} loading={busyId === t.id} onClick={() => move(t, "Completed", "Collection marked as completed.")}>Complete</Button>}
                  </div>
                </li>
              ))}
            </ul>
            <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
          </>
        )}
      </section>
    </>
  );
}
