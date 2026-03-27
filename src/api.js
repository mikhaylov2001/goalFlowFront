const BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

const api = {
  // Goals
  getGoals: () => request("/api/goals"),
  createGoal: (data) => request("/api/goals", { method: "POST", body: JSON.stringify(data) }),
  updateGoal: (id, data) => request(`/api/goals/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteGoal: (id) => request(`/api/goals/${id}`, { method: "DELETE" }),

  // Tasks
  createTask: (data) => request("/api/tasks", { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id, data) => request(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTask: (id) => request(`/api/tasks/${id}`, { method: "DELETE" }),

  // Microtasks
  createMicro: (data) => request("/api/microtasks", { method: "POST", body: JSON.stringify(data) }),
  updateMicro: (id, data) => request(`/api/microtasks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteMicro: (id) => request(`/api/microtasks/${id}`, { method: "DELETE" }),

  // Habits
  getHabits: () => request("/api/habits"),
  createHabit: (data) => request("/api/habits", { method: "POST", body: JSON.stringify(data) }),
  updateHabit: (id, data) => request(`/api/habits/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteHabit: (id) => request(`/api/habits/${id}`, { method: "DELETE" }),
  toggleHabit: (id, date) => request(`/api/habits/${id}/toggle`, { method: "POST", body: JSON.stringify({ date }) }),

  // Wishes
  getWishes: () => request("/api/wishes"),
  createWish: (data) => request("/api/wishes", { method: "POST", body: JSON.stringify(data) }),
  updateWish: (id, data) => request(`/api/wishes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteWish: (id) => request(`/api/wishes/${id}`, { method: "DELETE" }),

  // Calendar tasks
  getCalendar: () => request("/api/calendar"),
  createCalendar: (data) => request("/api/calendar", { method: "POST", body: JSON.stringify(data) }),
  updateCalendar: (id, data) => request(`/api/calendar/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCalendar: (id) => request(`/api/calendar/${id}`, { method: "DELETE" }),
};

export default api;

