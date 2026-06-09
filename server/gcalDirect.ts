/**
 * Direct Google Calendar integration using OAuth2 refresh token.
 * No Perplexity connector needed — works standalone on Railway.
 *
 * The refresh token is read from the oauth module (which loads it from
 * /data/gcal-token.json on startup) with a fallback to the GCAL_REFRESH_TOKEN
 * env var for backwards compatibility.
 */

import { getRefreshToken, gcalTokenAvailable } from "./oauth";

interface GCalEvent {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;
// Track which refresh token the cached access token was obtained with so we
// invalidate the cache when the token changes (e.g. after OAuth connect).
let cachedForRefreshToken: string | null = null;

async function getAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No GCal refresh token available");

  const clientId = process.env.GCAL_CLIENT_ID;
  const clientSecret = process.env.GCAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GCAL_CLIENT_ID or GCAL_CLIENT_SECRET is not set");
  }

  const now = Date.now();
  if (
    cachedAccessToken &&
    cachedForRefreshToken === refreshToken &&
    now < tokenExpiry - 60000
  ) {
    return cachedAccessToken;
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`GCal token refresh failed: ${err}`);
  }

  const data = await resp.json() as { access_token: string; expires_in: number };
  cachedAccessToken = data.access_token;
  cachedForRefreshToken = refreshToken;
  tokenExpiry = now + data.expires_in * 1000;
  return cachedAccessToken;
}

export async function createCalendarEvent(event: GCalEvent): Promise<string> {
  const token = await getAccessToken();

  const resp = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`GCal event creation failed: ${err}`);
  }

  const data = await resp.json() as { id: string };
  return data.id;
}

const ACT_TYPE_LABELS: Record<string, string> = {
  call: "Anruf",
  demo: "Demo",
  proposal: "Angebot",
  follow_up: "Follow-up",
  meeting: "Meeting",
  email: "E-Mail",
  closed_won: "Abschluss",
  closed_lost: "Verloren",
};

export async function syncActivityToCalendar(activity: {
  id: number;
  type: string;
  description: string;
  dueDate: string;
  dueTime?: string | null;
}, companyName: string, contactName: string): Promise<string> {
  const typeLabel = ACT_TYPE_LABELS[activity.type] ?? activity.type;
  const timeStr = activity.dueTime ?? "09:00";
  const startISO = `${activity.dueDate}T${timeStr}:00+02:00`;

  // End = 1 hour later
  const [hours, minutes] = timeStr.split(":").map(Number);
  const endHours = String((hours + 1) % 24).padStart(2, "0");
  const endMinutes = String(minutes).padStart(2, "0");
  const endISO = `${activity.dueDate}T${endHours}:${endMinutes}:00+02:00`;


  const event: GCalEvent = {
    summary: `${companyName} - ${contactName} (${typeLabel})`,
    description: activity.description,
    start: { dateTime: startISO, timeZone: "Europe/Berlin" },
    end: { dateTime: endISO, timeZone: "Europe/Berlin" },
  };

  console.log(`[GCal] Syncing activity ${activity.id} (${typeLabel}) for "${companyName}" on ${activity.dueDate} at ${timeStr}`);

  try {
    const eventId = await createCalendarEvent(event);
    console.log(`[GCal] Successfully created calendar event ${eventId} for activity ${activity.id}`);
    return eventId;
  } catch (err: any) {
    console.error(`[GCal] Failed to create calendar event for activity ${activity.id} ("${companyName}", ${activity.dueDate}): ${err.message}`);
    // Re-throw so the caller (route handler or background sync) can react appropriately
    throw err;
  }
}


export function gcalConfigured(): boolean {
  return !!(process.env.GCAL_CLIENT_ID && process.env.GCAL_CLIENT_SECRET && gcalTokenAvailable());
}

/**
 * Periodic background sync: finds every activity that has a dueDate but no
 * calendarEventId yet and pushes it to Google Calendar.  Errors are logged
 * but never re-thrown so the interval never crashes the process.
 */
export async function syncAllActivitiesToCalendar(): Promise<void> {
  if (!gcalConfigured()) return;

  // Lazy-import storage here to avoid a circular-dependency at module load time
  const { storage } = await import("./storage");

  const allActivities = storage.getAllActivities();
  const pending = allActivities.filter((a) => a.dueDate && !a.calendarEventId);

  if (pending.length === 0) return;

  console.log(`[GCal] Background sync: ${pending.length} unsynced activit${pending.length === 1 ? "y" : "ies"} found`);

  for (const activity of pending) {
    try {
      const customer = storage.getCustomer(activity.customerId);
      const companyName = customer?.companyName ?? "Kunde";
      const contactName = customer?.contactName ?? "Kontakt";

      const eventId = await syncActivityToCalendar(
        {
          id: activity.id,
          type: activity.type,
          description: activity.description,
          dueDate: activity.dueDate!,
          dueTime: activity.dueTime,
        },
        companyName,
        contactName
      );

      storage.updateActivity(activity.id, { calendarEventId: eventId });
      console.log(`[GCal] Background sync: event created for activity ${activity.id} → ${eventId}`);
    } catch (err: any) {
      console.error(`[GCal] Background sync: failed for activity ${activity.id}:`, err.message);
    }
  }
}
