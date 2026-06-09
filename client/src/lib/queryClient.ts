import { QueryClient, QueryFunction } from "@tanstack/react-query";

// In published pplx.app sites, backend API calls must use /port/5000 prefix.
// In dev (vite proxy), empty string works because vite proxies /api -> localhost:5000.
export const API_BASE = (typeof window !== "undefined" && window.location.hostname.endsWith(".pplx.app"))
  ? "/port/5000"
  : ("__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__");

// ── Structured API error ──────────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Map raw HTTP errors to user-friendly German messages. */
function toUserMessage(status: number, body: any): string {
  if (body?.error === "validation_error") {
    return body.message ?? "Bitte überprüfe deine Eingaben.";
  }
  if (body?.message) return body.message;
  if (status === 0 || status >= 500) {
    return "Etwas ist schief gelaufen. Bitte versuche es später erneut.";
  }
  if (status === 404) return "Der angeforderte Eintrag wurde nicht gefunden.";
  if (status === 401 || status === 403) return "Keine Berechtigung für diese Aktion.";
  return "Verbindung fehlgeschlagen. Versuche es in Kürze erneut…";
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let body: any = null;
    try { body = await res.json(); } catch { body = { message: res.statusText }; }
    const message = toUserMessage(res.status, body);
    throw new ApiError(
      res.status,
      body?.error ?? "http_error",
      message,
      body?.details,
    );
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
    });
    await throwIfResNotOk(res);
    return res;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Network-level failure (no response at all)
    throw new ApiError(0, "network_error", "Verbindung fehlgeschlagen. Versuche es in Kürze erneut…");
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(`${API_BASE}${queryKey.join("/")}`);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(0, "network_error", "Verbindung fehlgeschlagen. Versuche es in Kürze erneut…");
    }
  };

/** Exponential backoff: 1s, 2s, 4s */
function retryDelay(attempt: number) {
  return Math.min(1000 * 2 ** attempt, 10_000);
}

/** Only retry on network errors or 5xx — never on 4xx (client errors). */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false;
  if (error instanceof ApiError) {
    return error.status === 0 || error.status >= 500;
  }
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: shouldRetry,
      retryDelay,
    },
    mutations: {
      retry: false,
    },
  },
});
