const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function api<T = any>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `API Error: ${res.status}`);
  }
  return res.json();
}

export const apiClient = {
  // Customers
  customers: {
    list: (search?: string, industry?: string) =>
      api(`/customers?${new URLSearchParams({ ...(search && { search }), ...(industry && { industry }) })}`),
    get: (id: string) => api(`/customers/${id}`),
    create: (data: any) => api("/customers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => api(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => api(`/customers/${id}`, { method: "DELETE" }),
    stats: () => api("/customers/stats"),
    activities: (id: string) => api(`/customers/${id}/activities`),
    addActivity: (id: string, data: any) =>
      api(`/customers/${id}/activities`, { method: "POST", body: JSON.stringify(data) }),
    commissions: (id: string) => api(`/customers/${id}/commissions`),
    notes: (id: string) => api(`/customers/${id}/notes`),
    summary: (id: string) => api(`/customers/${id}/summary`),
    timeline: (id: string) => api(`/customers/${id}/timeline`),
  },

  // AI
  ai: {
    stats: () => api("/ai/stats"),
    briefing: () => api("/ai/briefing"),
    processNote: (customerId: string, content: string) =>
      api("/ai/process-note", { method: "POST", body: JSON.stringify({ customerId, content }) }),
    suggestTasks: () => api("/ai/suggest-tasks", { method: "POST" }),
    optimizeRoute: (date?: string) =>
      api("/ai/optimize-route", { method: "POST", body: JSON.stringify({ date }) }),
    dailyPlan: (date?: string) =>
      api("/ai/daily-plan", { method: "POST", body: JSON.stringify({ date }) }),
    suggestions: () => api("/ai/suggestions"),
  },

  // Tasks
  tasks: {
    list: (status?: string, priority?: string) =>
      api(`/tasks?${new URLSearchParams({ ...(status && { status }), ...(priority && { priority }) })}`),
    get: (id: string) => api(`/tasks/${id}`),
    create: (data: any) => api("/tasks", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => api(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => api(`/tasks/${id}`, { method: "DELETE" }),
    complete: (id: string) => api(`/tasks/${id}/complete`, { method: "PATCH" }),
  },

  // Appointments
  appointments: {
    list: (date?: string) => api(`/appointments${date ? `?date=${date}` : ""}`),
    get: (id: string) => api(`/appointments/${id}`),
    create: (data: any) => api("/appointments", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => api(`/appointments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => api(`/appointments/${id}`, { method: "DELETE" }),
  },

  // Routes
  routes: {
    list: () => api("/routes"),
    get: (id: string) => api(`/routes/${id}`),
    byDate: (date: string) => api(`/routes/date/${date}`),
    delete: (id: string) => api(`/routes/${id}`, { method: "DELETE" }),
  },

  // Calendar
  calendar: {
    authUrl: () => api("/calendar/auth-url"),
    callback: (code: string) => api(`/calendar/callback?code=${code}`),
    sync: (appointmentId: string) =>
      api("/calendar/sync", { method: "POST", body: JSON.stringify({ appointmentId }) }),
    events: () => api("/calendar/events"),
  },

  // Maps
  maps: {
    customers: () => api("/maps/customers"),
    route: (origin: string, destinations: string[]) =>
      api(`/maps/route?origin=${encodeURIComponent(origin)}&destinations=${destinations.join(",")}`),
  },

  // Organizations
  organizations: {
    list: () => api("/organizations"),
    get: (slug: string) => api(`/organizations/${slug}`),
    create: (data: any) => api("/organizations", { method: "POST", body: JSON.stringify(data) }),
  },
};
