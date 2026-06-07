/**
 * Direct Google Calendar integration using OAuth2 refresh token.
 * No Perplexity connector needed — works standalone on Railway.
 */

interface GCalEvent {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

const GCAL_CLIENT_ID = process.env.GCAL_CLIENT_ID!;
const GCAL_CLIENT_SECRET = process.env.GCAL_CLIENT_SECRET!;
const GCAL_REFRESH_TOKEN = process.env.GCAL_REFRESH_TOKEN!;

let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && now < tokenExpiry - 60000) {
    return cachedAccessToken;
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GCAL_CLIENT_ID,
      client_secret: GCAL_CLIENT_SECRET,
      refresh_token: GCAL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`GCal token refresh failed: ${err}`);
  }

  const data = await resp.json() as { access_token: string; expires_in: number };
  cachedAccessToken = data.access_token;
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
}, companyName: string): Promise<string> {
  const typeLabel = ACT_TYPE_LABELS[activity.type] ?? activity.type;
  const timeStr = activity.dueTime ?? "09:00";
  const startISO = `${activity.dueDate}T${timeStr}:00+02:00`;

  // End = 1 hour later
  const startDate = new Date(`${activity.dueDate}T${timeStr}:00+02:00`);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  const endISO = endDate.toISOString().replace("Z", "+02:00").replace(/\.\d{3}/, "");

  const event: GCalEvent = {
    summary: `[CGP CRM] ${typeLabel}: ${companyName}`,
    description: `${activity.description}\n\nKunde: ${companyName}\nTyp: ${typeLabel}`,
    start: { dateTime: startISO, timeZone: "Europe/Berlin" },
    end: { dateTime: endISO, timeZone: "Europe/Berlin" },
  };

  return createCalendarEvent(event);
}

export function gcalConfigured(): boolean {
  return !!(GCAL_CLIENT_ID && GCAL_CLIENT_SECRET && GCAL_REFRESH_TOKEN);
}
