export const STATUSES = ["Pending", "Scheduled", "Assigned", "In Progress", "Completed", "Cancelled"];
export const WASTE_TYPES = ["Household", "Recyclable", "Organic", "Garden", "Bulky", "Other"];
export const TIME_WINDOWS = [
  { value: "Morning", label: "Morning, 8am to 12pm" },
  { value: "Afternoon", label: "Afternoon, 12pm to 4pm" },
  { value: "Evening", label: "Evening, 4pm to 6pm" },
];
export const ROLES = { resident: "Resident", personnel: "Waste personnel", admin: "Administrator" };
export const isStaff = (user) => user && (user.role === "personnel" || user.role === "admin");
