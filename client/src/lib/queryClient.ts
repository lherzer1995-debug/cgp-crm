import { QueryClient, QueryFunction } from "@tanstack/react-query";

// In published pplx.app sites, backend API calls must use /port/5000 prefix.
// In dev (vite proxy), empty string works because vite proxies /api -> localhost:5000.
export const API_BASE = (typeof window !== "undefined" && window.location.hostname.endsWith(".pplx.app"))
  ? "/port/5000"
  : ("__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__");

/** Maps HTTP status codes to user-friendly German messages. */
function friendlyErrorMessage(status: number, fallback: string): string {
  if (status === 0 || fallback.toLowerCase().includes("failed to fetch")) {
    return "Verbindung unterbrochen. Bitte Internetverbindung prüfen.";
  }
  if (status === 401) return "Sitzung abgelaufen. Bitte Seite neu laden.";
  if (status === 403) return "Keine Berechtigung für diese Aktion.";
  if (status === 404) return "Die angeforderten Daten wurden nicht gefunden.";
  if (status >= 500) return "Serverfehler. Bitte versuche es später erneut.";
  return "Daten konnten nicht geladen werden. Bitte versuche es später erneut.";
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(friendlyErrorMessage(res.status, text));
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${url}`, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
    });
  } catch (err: any) {
    throw new Error("Verbindung unterbrochen. Bitte Internetverbindung prüfen.");
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${queryKey.join("/")}`);
    } catch {
      throw new Error("Verbindung unterbrochen. Bitte Internetverbindung prüfen.");
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});
