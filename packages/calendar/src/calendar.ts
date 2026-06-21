const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR = "https://www.googleapis.com/calendar/v3";

function getClientId() { return process.env.GOOGLE_CLIENT_ID || ""; }
function getClientSecret() { return process.env.GOOGLE_CLIENT_SECRET || ""; }
function getRedirectUri() { return process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/integrations/google/callback"; }

// In-memory token store (use DB in production)
const tokenStore = new Map<string, { accessToken: string; refreshToken?: string; expiry: number }>();

export function createAuthUrl(state = "cgp-crm"): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH}?${params}`;
}

export async function exchangeCode(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number } | null> {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  }).then(r => r.json());

  if (res.error) return null;

  const userId = "default"; // Replace with real user ID in production
  tokenStore.set(userId, {
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
    expiry: Date.now() + (res.expires_in || 3600) * 1000,
  });

  return { accessToken: res.access_token, refreshToken: res.refresh_token, expiresIn: res.expires_in };
}

async function getValidToken(userId = "default"): Promise<string | null> {
  const t = tokenStore.get(userId);
  if (!t) return null;

  if (Date.now() < t.expiry - 60000) return t.accessToken;

  // Refresh
  if (!t.refreshToken) return null;
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: t.refreshToken,
      grant_type: "refresh_token",
    }),
  }).then(r => r.json());

  if (res.error) return null;

  tokenStore.set(userId, {
    accessToken: res.access_token,
    refreshToken: t.refreshToken,
    expiry: Date.now() + (res.expires_in || 3600) * 1000,
  });

  return res.access_token;
}

export function disconnect(userId = "default") {
  tokenStore.delete(userId);
  return { disconnected: true };
}

export function getStatus() {
  const t = tokenStore.get("default");
  return { connected: !!t, expiresAt: t ? new Date(t.expiry).toISOString() : null };
}

export interface CalendarEvent {
  summary: string;
  description?: string;
  start: string; // ISO datetime
  end: string;
  location?: string;
  attendees?: string[];
}

export async function createEvent(event: CalendarEvent) {
  const token = await getValidToken();
  if (!token) return null;

  const res = await fetch(`${GOOGLE_CALENDAR}/calendars/primary/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start, timeZone: "Europe/Berlin" },
      end: { dateTime: event.end, timeZone: "Europe/Berlin" },
      location: event.location,
      attendees: event.attendees?.map(email => ({ email })),
    }),
  }).then(r => r.json());

  return res;
}

export async function listEvents(timeMin?: string, timeMax?: string) {
  const token = await getValidToken();
  if (!token) return [];

  const params = new URLSearchParams({
    timeMin: timeMin || new Date().toISOString(),
    maxResults: "50",
    singleEvents: "true",
    orderBy: "startTime",
  });
  if (timeMax) params.set("timeMax", timeMax);

  const res = await fetch(`${GOOGLE_CALENDAR}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());

  return res.items || [];
}

export async function checkConflicts(start: string, end: string): Promise<boolean> {
  const events = await listEvents(start, end);
  return events.length > 0;
}

export async function findFreeSlots(date: string, durationMin = 60): Promise<{ start: string; end: string }[]> {
  const dayStart = `${date}T08:00:00+02:00`;
  const dayEnd = `${date}T18:00:00+02:00`;
  const events = await listEvents(dayStart, dayEnd);

  const busySlots = events
    .filter((e: any) => e.start?.dateTime && e.end?.dateTime)
    .map((e: any) => ({ start: new Date(e.start.dateTime), end: new Date(e.end.dateTime) }))
    .sort((a: any, b: any) => a.start.getTime() - b.start.getTime());

  const slots: { start: string; end: string }[] = [];
  let cursor = new Date(dayStart);
  const endTime = new Date(dayEnd);

  for (const busy of busySlots) {
    if (busy.start.getTime() - cursor.getTime() >= durationMin * 60000) {
      const slotEnd = new Date(cursor.getTime() + durationMin * 60000);
      if (slotEnd <= endTime) {
        slots.push({ start: cursor.toISOString(), end: slotEnd.toISOString() });
      }
    }
    if (busy.end > cursor) cursor = busy.end;
  }

  if (endTime.getTime() - cursor.getTime() >= durationMin * 60000) {
    slots.push({ start: cursor.toISOString(), end: new Date(cursor.getTime() + durationMin * 60000).toISOString() });
  }

  return slots;
}
