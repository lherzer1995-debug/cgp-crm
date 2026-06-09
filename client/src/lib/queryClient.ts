import { QueryClient, QueryFunction } from "@tanstack/react-query";

// In published pplx.app sites, backend API calls must use /port/5000 prefix.
// In dev (vite proxy), empty string works because vite proxies /api -> localhost:5000.
export const API_BASE = (typeof window !== "undefined" && window.location.hostname.endsWith(".pplx.app"))
  ? "/port/5000"
  : ("__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__");

// ── User-friendly error messages ──────────────────────────────────────────────
function toFriendlyMessage(status: number): string {
  if (status === 401 || status === 403)
    return "Keine Berechtigung. Bitte neu anmelden.";
  if (status === 404)
    return "Der angeforderte Datensatz wurde nicht gefunden.";
  if (status === 408 || status === 504)
    return "Die Anfrage hat zu lange gedauert. Bitte erneut versuchen.";
  if (status === 429)
    return "Zu viele Anfragen. Bitte kurz warten und erneut versuchen.";
  if (status >= 500)
    return "Serverfehler – bitte in Kürze erneut versuchen.";
  if (typeof navigator !== "undefined" && !navigator.onLine)
    return "Keine Internetverbindung. Bitte Verbindung prüfen.";
  return "Ein unerwarteter Fehler ist aufgetreten. Bitte erneut versuchen.";
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const raw = (await res.text()) || res.statusText;
    const message = toFriendlyMessage(res.status);
    const err = new Error(message) as Error & { status: number; raw: string };
    err.status = res.status;
    err.raw = raw;
    throw err;
  }
}

// ── Retry helpers ─────────────────────────────────────────────────────────────
function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = (error as any)?.status;
  // Never retry auth errors or not-found
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 3;
}

function retryDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s with ±200ms jitter
  return Math.min(1000 * 2 ** attempt + Math.random() * 200, 10_000);
}

// ── Fetch with timeout ────────────────────────────────────────────────────────
async function fetchWithTimeout(
  input: RequestInfo,
  init?: RequestInit,
  timeoutMs = 15_000,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      const timeout = new Error(
        "Die Anfrage hat zu lange gedauert. Bitte erneut versuchen.",
      ) as Error & { status: number };
      timeout.status = 408;
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetchWithTimeout(`${API_BASE}${url}`, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetchWithTimeout(`${API_BASE}${queryKey.join("/")}`);

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
      retry: shouldRetry,
      retryDelay,
    },
    mutations: {
      retry: (failureCount, error) => {
        const status = (error as any)?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      retryDelay,
    },
  },
});
