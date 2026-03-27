const BASE = import.meta.env?.VITE_API_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `API ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return res.json();
}

const api = {
  getCalendar() {
    return request("/api/calendar");
  },
  createCalendar(payload) {
    return request("/api/calendar", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateCalendar(id, payload) {
    return request(`/api/calendar/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  deleteCalendar(id) {
    return request(`/api/calendar/${id}`, {
      method: "DELETE",
    });
  },
};

export default api;
