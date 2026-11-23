import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Pagination, SkeletonRows, EmptyState, ErrorState, StatusBadge } from "./ui";
import { useAsync } from "../hooks/useAsync";
import { useDebounce } from "../hooks/useUi";
import { formatDate } from "../utils/format";

export default function RequestList({ fetcher, statusOptions, showRequester, emptyTitle, emptyMessage, emptyAction }) {
  const [filters, setFilters] = useState({ q: "", status: "", date_from: "", date_to: "" });
  const [page, setPage] = useState(1);
  const q = useDebounce(filters.q);
  const { data, error, loading, reload } = useAsync(
    () => fetcher({ page, page_size: 10, q, status: filters.status, date_from: filters.date_from, date_to: filters.date_to }),
    [page, q, filters.status, filters.date_from, filters.date_to]
  );

  const change = (key) => (e) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: e.target.value }));
  };
  const filtered = Boolean(q || filters.status || filters.date_from || filters.date_to);

  return (
    <section className="card">
      <div className="filters">
        <label className="search">
          <Search size={16} aria-hidden="true" />
          <input type="search" placeholder="Search reference or address" value={filters.q} onChange={change("q")} aria-label="Search" />
        </label>
        <select value={filters.status} onChange={change("status")} aria-label="Filter by status">
          <option value="">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label className="date-filter">
          From <input type="date" value={filters.date_from} onChange={change("date_from")} />
        </label>
        <label className="date-filter">
          To <input type="date" value={filters.date_to} onChange={change("date_to")} />
        </label>
      </div>

      {loading && !data ? (
        <SkeletonRows />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} title="We could not load the requests" />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={filtered ? "No matching requests" : emptyTitle}
          message={filtered ? "Try a different search or clear the filters." : emptyMessage}
          action={filtered ? undefined : emptyAction}
        />
      ) : (
        <>
          <div className={`table-wrap ${loading ? "is-refreshing" : ""}`}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  {showRequester && <th>Requester</th>}
                  <th>Address</th>
                  <th>Preferred date</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Reference">
                      <Link to={`/requests/${r.id}`} className="link-strong">
                        {r.reference}
                      </Link>
                    </td>
                    {showRequester && <td data-label="Requester">{r.requester_name}</td>}
                    <td data-label="Address">{r.collection_address}</td>
                    <td data-label="Preferred date">{formatDate(r.preferred_date)}</td>
                    <td data-label="Scheduled">{r.schedule ? formatDate(r.schedule.scheduled_date) : "Not yet"}</td>
                    <td data-label="Status">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
        </>
      )}
    </section>
  );
}
