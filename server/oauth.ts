/**
 * Google OAuth2 authorization code flow.
 *
 * Endpoints:
 *   GET  /api/oauth/google/auth-url   → returns the consent-screen URL
 *   GET  /api/oauth/google/callback   → receives ?code= from Google, exchanges
 *                                       it for a refresh token, stores it, and
 *                                       redirects the browser back to /settings
 *   GET  /api/oauth/google/status     → { connected: bool, email?: string }
 *   POST /api/oauth/google/disconnect → removes the stored token
 *
 * The refresh token is persisted to /data/gcal-token.json (Railway persistent
 * volume) so it survives redeploys.  In development it falls back to
 * gcal-token.json in the project root.
 */

import fs from "node:fs";
import path from "node:path";
import type { Express } from "express";

// ── Token file path ──────────────────────────────────────────────────────────
const TOKEN_PATH =
  process.env.NODE_ENV === "production" && fs.existsSync("/data")
    ? "/data/gcal-token.json"
    : path.resolve("gcal-token.json");

export interface GCalToken {
  refreshToken: string;
  email?: string;
  connectedAt: string;
}

let _token: GCalToken | null = null;

/** Load token from disk (called once at startup). */
export function loadTokenFromDisk(): void {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const raw = fs.readFileSync(TOKEN_PATH, "utf-8");
      _token = JSON.parse(raw) as GCalToken;
      console.log("[OAuth] Loaded GCal token from disk", TOKEN_PATH);
    }
  } catch (err: any) {
    console.error("[OAuth] Failed to load token from disk:", err.message);
    _token = null;
  }
}

/** Persist token to disk and update in-memory cache. */
function saveToken(token: GCalToken): void {
  _token = token;
  try {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2), "utf-8");
    console.log("[OAuth] GCal token saved to", TOKEN_PATH);
  } catch (err: any) {
    console.error("[OAuth] Failed to save token:", err.message);
  }
}

/** Remove token from disk and memory. */
function clearToken(): void {
  _token = null;
  try {
    if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
    console.log("[OAuth] GCal token removed");
  } catch (err: any) {
    console.error("[OAuth] Failed to remove token:", err.message);
  }
}

/** Returns the current in-memory token (may be null). */
export function getStoredToken(): GCalToken | null {
  return _token;
}

/** True when a refresh token is available (from file or env fallback). */
export function gcalTokenAvailable(): boolean {
  return !!(_token?.refreshToken || process.env.GCAL_REFRESH_TOKEN);
}

/** Returns the active refresh token (file-stored takes priority over env var). */
export function getRefreshToken(): string | null {
  return _token?.refreshToken ?? process.env.GCAL_REFRESH_TOKEN ?? null;
}

// ── OAuth helpers ────────────────────────────────────────────────────────────
const REDIRECT_URI = "https://cgp-crm-production.up.railway.app/api/oauth/google/callback";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function buildAuthUrl(): string {
  const clientId = process.env.GCAL_CLIENT_ID;
  if (!clientId) throw new Error("GCAL_CLIENT_ID is not set");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCodeForTokens(
  code: string
): Promise<{ refreshToken: string; accessToken: string; email?: string }> {
  const clientId = process.env.GCAL_CLIENT_ID;
  const clientSecret = process.env.GCAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GCAL_CLIENT_ID or GCAL_CLIENT_SECRET is not set");
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const data = (await resp.json()) as {
    access_token: string;
    refresh_token?: string;
    error?: string;
  };

  if (data.error) throw new Error(`Token exchange error: ${data.error}`);
  if (!data.refresh_token) {
    throw new Error(
      "No refresh_token returned — make sure prompt=consent is set and the app has offline access"
    );
  }

  // Fetch the user's email address
  let email: string | undefined;
  try {
    const userResp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (userResp.ok) {
      const user = (await userResp.json()) as { email?: string };
      email = user.email;
    }
  } catch (_) {
    // Non-fatal — email is optional
  }

  return { refreshToken: data.refresh_token, accessToken: data.access_token, email };
}

// ── Route registration ───────────────────────────────────────────────────────
export function registerOAuthRoutes(app: Express): void {
  /** Returns the Google OAuth consent-screen URL. */
  app.get("/api/oauth/google/auth-url", (_req, res) => {
    try {
      const url = buildAuthUrl();
      res.json({ url });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  /**
   * Google redirects here after the user grants (or denies) permission.
   * We exchange the code for tokens, persist the refresh token, then
   * redirect the browser back to the settings page.
   */
  app.get("/api/oauth/google/callback", async (req, res) => {
    const { code, error } = req.query as Record<string, string>;

    if (error) {
      console.error("[OAuth] Google returned error:", error);
      return res.redirect("/#/settings?gcal=error&reason=" + encodeURIComponent(error));
    }

    if (!code) {
      return res.redirect("/#/settings?gcal=error&reason=no_code");
    }

    try {
      const { refreshToken, email } = await exchangeCodeForTokens(code);
      saveToken({ refreshToken, email, connectedAt: new Date().toISOString() });
      console.log("[OAuth] Google Calendar connected", email ? `(${email})` : "");
      return res.redirect("/#/settings?gcal=success");
    } catch (err: any) {
      console.error("[OAuth] Callback error:", err.message);
      return res.redirect(
        "/#/settings?gcal=error&reason=" + encodeURIComponent(err.message)
      );
    }
  });

  /** Returns whether Google Calendar is connected and the associated email. */
  app.get("/api/oauth/google/status", (_req, res) => {
    const token = getStoredToken();
    if (token) {
      res.json({ connected: true, email: token.email ?? null, connectedAt: token.connectedAt });
    } else if (process.env.GCAL_REFRESH_TOKEN) {
      // Legacy: token provided via env var
      res.json({ connected: true, email: null, connectedAt: null, legacy: true });
    } else {
      res.json({ connected: false });
    }
  });

  /** Disconnects Google Calendar by removing the stored token. */
  app.post("/api/oauth/google/disconnect", (_req, res) => {
    clearToken();
    res.json({ success: true });
  });
}
