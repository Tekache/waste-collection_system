import { api } from "./api";

export const authService = {
  register: (body) => api.post("/auth/register", body, { auth: false }),
  login: (body) => api.post("/auth/login", body, { auth: false }),
  me: () => api.get("/auth/me"),
  updateProfile: (body) => api.patch("/auth/me", body),
};

export const requestService = {
  list: (params) => api.get("/requests", params),
  get: (id) => api.get(`/requests/${id}`),
  create: (body) => api.post("/requests", body),
  update: (id, body) => api.patch(`/requests/${id}`, body),
  cancel: (id, reason) => api.patch(`/requests/${id}`, { status: "Cancelled", cancel_reason: reason || null }),
};

export const scheduleService = {
  list: (params) => api.get("/schedules", params),
  create: (body) => api.post("/schedules", body),
  update: (id, body) => api.patch(`/schedules/${id}`, body),
};

export const taskService = {
  list: (params) => api.get("/tasks", params),
  create: (body) => api.post("/tasks", body),
  update: (id, body) => api.patch(`/tasks/${id}`, body),
};

export const historyService = { list: (params) => api.get("/history", params) };
export const dashboardService = { stats: () => api.get("/dashboard/stats") };

export const userService = {
  personnel: () => api.get("/users/personnel"),
  list: (params) => api.get("/admin/users", params),
  create: (body) => api.post("/admin/users", body),
  update: (id, body) => api.patch(`/admin/users/${id}`, body),
};
