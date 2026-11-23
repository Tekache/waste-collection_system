import { Link, useNavigate } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import RequestForm from "../components/RequestForm";
import RequestList from "../components/RequestList";
import { Button, PageHeader } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { historyService, requestService } from "../services";
import { STATUSES, isStaff } from "../utils/constants";

export function RequestsPage() {
  const { user } = useAuth();
  const staff = isStaff(user);
  return (
    <>
      <PageHeader
        title={staff ? "Collection requests" : "My requests"}
        subtitle={staff ? "Open a request to schedule it and assign personnel." : "Every request you have submitted and where it stands."}
        actions={!staff && <Link to="/requests/new"><Button icon={PlusCircle}>New request</Button></Link>}
      />
      <RequestList
        fetcher={requestService.list}
        statusOptions={STATUSES}
        showRequester={staff}
        emptyTitle="No collection requests yet"
        emptyMessage={staff ? "Requests submitted by residents will appear here." : "Submit your first collection request to get started."}
        emptyAction={!staff && <Link to="/requests/new"><Button>Create request</Button></Link>}
      />
    </>
  );
}

export function HistoryPage() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Collection history" subtitle="Completed and cancelled collections kept for reference." />
      <RequestList
        fetcher={historyService.list}
        statusOptions={["Completed", "Cancelled"]}
        showRequester={isStaff(user)}
        emptyTitle="No completed collections yet"
        emptyMessage="Finished and cancelled requests are kept here."
      />
    </>
  );
}

export function NewRequestPage() {
  const toast = useToast();
  const navigate = useNavigate();
  async function submit(values) {
    const created = await requestService.create(values);
    toast.success(`Request ${created.reference} submitted.`);
    navigate(`/requests/${created.id}`);
  }
  return (
    <>
      <PageHeader title="New collection request" subtitle="Tell us where and when. Personnel review it and schedule a pickup." />
      <section className="card narrow"><RequestForm onSubmit={submit} onCancel={() => navigate("/requests")} /></section>
    </>
  );
}
