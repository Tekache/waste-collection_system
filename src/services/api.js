const BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");
const TOKEN_KEY = "wcs_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export class ApiError extends Error {
  constructor(message, { status = 0, code = "ERROR", fields = {} } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function request(path, { method = "GET", body, params, auth = true } = {}) {
  const url = new URL(`${BASE}/api${path}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });

  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection and try again.", { code: "NETWORK_ERROR" });
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    if (response.status === 401 && auth && onUnauthorized) onUnauthorized(payload?.error);
    const fields = {};
    (payload?.errors || []).forEach((e) => {
      if (e.field) fields[e.field] = e.message;
    });
    throw new ApiError(payload?.message || "Something went wrong. Please try again.", {
      status: response.status,
      code: payload?.error || "ERROR",
      fields,
    });
  }
  return payload.data;
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body, opts) => request(path, { method: "POST", body, ...opts }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
};
