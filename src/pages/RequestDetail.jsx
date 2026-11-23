import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Ban, CalendarClock, CalendarPlus, CheckCircle2, Pencil, Play, UserCheck, UserMinus } from "lucide-react";
import RequestForm from "../components/RequestForm";
import { Button, ConfirmDialog, ErrorState, Field, Modal, Skeleton, StatusBadge } from "../components/ui";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { requestService, scheduleService, taskService, userService } from "../services";
import { TIME_WINDOWS, isStaff } from "../utils/constants";
import { formatDate, formatDateTime, todayISO } from "../utils/format";

const STEPS = ["Pending", "Scheduled", "Assigned", "In Progress", "Completed"];

function Stepper({ status }) {
  const current = STEPS.indexOf(status);
  return (
    <ol className="stepper" aria-label="Request progress">
      {STEPS.map((step, i) => (
        <li key={step} className={status === "Cancelled" ? "" : i < current ? "done" : i === current ? "current" : ""} aria-current={i === current ? "step" : undefined}>
          <span className="dot">{i < current ? <CheckCircle2 size={14} aria-hidden="true" /> : i + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}

function ScheduleModal({ request, onClose, onDone }) {
  const toast = useToast();
  const existing = request.schedule;
  const [values, setValues] = useState({ scheduled_date: existing?.scheduled_date || request.preferred_date, time_window: existing?.time_window || request.preferred_time_window, notes: existing?.notes || "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!values.scheduled_date || values.scheduled_date < todayISO()) return setError("Choose a collection date that is today or later.");
    setBusy(true);
    try {
      const body = { ...values, notes: values.notes.trim() || null };
      if (existing) await scheduleService.update(existing.schedule_id, body);
      else await scheduleService.create({ ...body, request_id: request.id });
      toast.success(existing ? "Collection rescheduled." : "Collection scheduled.");
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={existing ? "Reschedule collection" : "Schedule collection"} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>{existing ? "Save schedule" : "Schedule collection"}</Button></>}>
      <div className="form-grid">
        {error && <div className="form-alert" role="alert">{error}</div>}
        <Field label="Collection date"><input type="date" min={todayISO()} value={values.scheduled_date} onChange={(e) => setValues({ ...values, scheduled_date: e.target.value })} /></Field>
        <Field label="Time window"><select value={values.time_window} onChange={(e) => setValues({ ...values, time_window: e.target.value })}>{TIME_WINDOWS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}</select></Field>
        <Field label="Notes (optional)"><textarea rows={2} value={values.notes} onChange={(e) => setValues({ ...values, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function AssignModal({ request, onClose, onDone }) {
  const toast = useToast();
  const reassign = request.status === "Assigned";
  const people = useAsync(userService.personnel, []);
  const [personnelId, setPersonnelId] = useState(request.assignment?.personnel_id || "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!personnelId) return setError("Choose who will carry out this collection.");
    setBusy(true);
    try {
      if (reassign) await taskService.update(request.assignment.task_id, { personnel_id: personnelId });
      else await taskService.create({ request_id: request.id, personnel_id: personnelId, notes: notes.trim() || null });
      toast.success(reassign ? "Task reassigned." : "Task assigned.");
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const none = people.data && people.data.length === 0;
  return (
    <Modal title={reassign ? "Reassign task" : "Assign personnel"} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={none} onClick={save}>{reassign ? "Reassign" : "Assign task"}</Button></>}>
      {people.loading ? <Skeleton height={44} /> : people.error ? <ErrorState error={people.error} onRetry={people.reload} /> : (
        <div className="form-grid">
          {error && <div className="form-alert" role="alert">{error}</div>}
          {none && <div className="form-alert">No active personnel accounts exist yet. An administrator can create them under Users.</div>}
          <Field label="Personnel">
            <select value={personnelId} onChange={(e) => setPersonnelId(e.target.value)}>
              <option value="">Select a team member</option>
              {people.data.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </Field>
          {!reassign && <Field label="Instructions (optional)"><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>}
        </div>
      )}
    </Modal>
  );
}

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const staff = isStaff(user);
  const { data: r, error, loading, reload } = useAsync(() => requestService.get(id), [id]);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const close = () => setDialog(null);
  const done = () => { close(); reload(); };

  async function run(action, message) {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      done();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !r) return <div className="stack"><Skeleton height={60} /><Skeleton height={300} /></div>;
  if (error) return <ErrorState error={error} onRetry={reload} title={error.status === 404 ? "Request not found" : "We could not load this request"} />;

  const isOwner = r.requester_id === user.id;
  const canWork = user.role === "admin" || r.assignment?.personnel_id === user.id;
  const taskId = r.assignment?.task_id;
  const canCancel = r.status !== "Completed" && r.status !== "Cancelled" && (staff || (isOwner && ["Pending", "Scheduled"].includes(r.status)));

  return (
    <div className="stack">
      <Link to="/requests" className="back-link"><ArrowLeft size={16} aria-hidden="true" /> Back to requests</Link>
      <div className="page-header">
        <div><h1>{r.reference}</h1><p>Submitted {formatDateTime(r.created_at)}{staff ? ` by ${r.requester_name}` : ""}</p></div>
        <StatusBadge status={r.status} />
      </div>

      {r.status === "Cancelled" ? <div className="form-alert" role="status"><Ban size={16} aria-hidden="true" /> This request was cancelled and will not be collected.</div> : <section className="card"><Stepper status={r.status} /></section>}

      <div className="action-bar">
        {isOwner && r.status === "Pending" && <Button variant="secondary" icon={Pencil} onClick={() => setDialog("edit")}>Edit details</Button>}
        {staff && r.status === "Pending" && <Button icon={CalendarPlus} onClick={() => setDialog("schedule")}>Schedule collection</Button>}
        {staff && ["Scheduled", "Assigned"].includes(r.status) && <Button variant="secondary" icon={CalendarClock} onClick={() => setDialog("schedule")}>Reschedule</Button>}
        {staff && r.status === "Scheduled" && <Button icon={UserCheck} onClick={() => setDialog("assign")}>Assign personnel</Button>}
        {staff && r.status === "Assigned" && canWork && <Button variant="secondary" icon={UserCheck} onClick={() => setDialog("assign")}>Reassign</Button>}
        {staff && r.status === "Assigned" && canWork && <Button icon={Play} loading={busy} onClick={() => run(() => taskService.update(taskId, { status: "In Progress" }), "Collection started.")}>Start collection</Button>}
        {staff && r.status === "In Progress" && canWork && <Button icon={CheckCircle2} loading={busy} onClick={() => run(() => taskService.update(taskId, { status: "Completed" }), "Collection marked as completed.")}>Mark completed</Button>}
        {staff && ["Assigned", "In Progress"].includes(r.status) && canWork && <Button variant="secondary" icon={UserMinus} onClick={() => setDialog("unassign")}>Unassign</Button>}
        {canCancel && <Button variant="danger" icon={Ban} onClick={() => setDialog("cancel")}>Cancel request</Button>}
      </div>

      <div className="two-col">
        <section className="card">
          <h2>Collection details</h2>
          <dl className="details">
            <dt>Address</dt><dd>{r.collection_address}</dd>
            <dt>Waste type</dt><dd>{r.waste_type}</dd>
            <dt>Description</dt><dd>{r.description}</dd>
            <dt>Preferred</dt><dd>{formatDate(r.preferred_date)}, {r.preferred_time_window}</dd>
            {r.notes && (<><dt>Crew notes</dt><dd>{r.notes}</dd></>)}
            {staff && (<><dt>Requester</dt><dd>{r.requester_name}{r.requester_phone ? `, ${r.requester_phone}` : ""}</dd></>)}
          </dl>
        </section>
        <section className="card">
          <h2>Schedule and crew</h2>
          <dl className="details">
            <dt>Collection date</dt><dd>{r.schedule ? `${formatDate(r.schedule.scheduled_date)}, ${r.schedule.time_window}` : "Not scheduled yet"}</dd>
            <dt>Assigned to</dt><dd>{r.assignment ? r.assignment.personnel_name : "Nobody yet"}</dd>
            {r.completed_at && (<><dt>Completed</dt><dd>{formatDateTime(r.completed_at)}</dd></>)}
          </dl>
          <h2 className="mt">Progress log</h2>
          <ol className="timeline">
            {[...r.timeline].reverse().map((e, i) => (
              <li key={i}><StatusBadge status={e.status} /><p>{e.note}</p><small>{e.by} · {formatDateTime(e.at)}</small></li>
            ))}
          </ol>
        </section>
      </div>

      {dialog === "edit" && <Modal title="Edit request" onClose={close}><RequestForm initial={r} submitLabel="Save changes" onCancel={close} onSubmit={async (v) => { await requestService.update(r.id, { collection_address: v.collection_address, waste_type: v.waste_type, description: v.description, preferred_date: v.preferred_date, preferred_time_window: v.preferred_time_window, notes: v.notes }); toast.success("Request updated."); done(); }} /></Modal>}
      {dialog === "schedule" && <ScheduleModal request={r} onClose={close} onDone={done} />}
      {dialog === "assign" && <AssignModal request={r} onClose={close} onDone={done} />}
      {dialog === "unassign" && <ConfirmDialog title="Unassign this task?" message="The request returns to Scheduled so another team member can be assigned." confirmLabel="Unassign" loading={busy} onClose={close} onConfirm={() => run(() => taskService.update(taskId, { status: "Cancelled" }), "Task unassigned.")} />}
      {dialog === "cancel" && <ConfirmDialog title="Cancel this request?" message="This cannot be undone. A new request is needed if the waste still needs collecting." confirmLabel="Cancel request" loading={busy} onClose={close} onConfirm={() => run(() => requestService.cancel(r.id), "Request cancelled.")} />}
    </div>
  );
}
