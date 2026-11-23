const parseDay = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const formatDate = (iso) =>
  iso ? parseDay(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Not set";

export const formatWeekday = (iso) =>
  parseDay(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

export const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

export const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const addDaysISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
