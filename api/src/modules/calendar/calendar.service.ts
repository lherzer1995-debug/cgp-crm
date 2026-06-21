import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CalendarService {
  private log = new Logger("Calendar");
  private readonly clientId = process.env.GOOGLE_CLIENT_ID!;
  private readonly clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  private readonly redirectUri = process.env.GOOGLE_REDIRECT_URI!;

  constructor(private db: PrismaService) {}

  getAuthUrl() {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events");
    url.searchParams.set("access_type", "offline");
    return { url: url.toString() };
  }

  async handleCallback(code: string) {
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const data: any = await res.json();

      await this.db.googleCalendarToken.upsert({
        where: { id: "" }, // Will need userId from auth
        create: {
          userId: "",
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiryDate: new Date(Date.now() + data.expires_in * 1000),
        },
        update: {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || undefined,
          expiryDate: new Date(Date.now() + data.expires_in * 1000),
        },
      });

      return { success: true, message: "Google Calendar verbunden" };
    } catch (err: any) {
      this.log.error("Calendar auth error", err);
      return { success: false, message: "Verbindung fehlgeschlagen" };
    }
  }

  async syncToCalendar(appointmentId: string) {
    const appointment = await this.db.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) throw new Error("Appointment not found");

    const token = await this.db.googleCalendarToken.findFirst();
    if (!token) throw new Error("No Google Calendar connected");

    try {
      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: appointment.title,
          description: appointment.description || "",
          start: { dateTime: appointment.startTime.toISOString(), timeZone: "Europe/Berlin" },
          end: { dateTime: appointment.endTime.toISOString(), timeZone: "Europe/Berlin" },
        }),
      });
      const event: any = await res.json();

      await this.db.appointment.update({
        where: { id: appointmentId },
        data: { googleEventId: event.id, calendarLink: event.htmlLink },
      });

      return { success: true, event };
    } catch (err: any) {
      this.log.error("Calendar sync error", err);
      return { success: false, message: "Sync fehlgeschlagen" };
    }
  }

  async listEvents() {
    const token = await this.db.googleCalendarToken.findFirst();
    if (!token) return { events: [] };

    try {
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?" +
        new URLSearchParams({
          timeMin: new Date().toISOString(),
          maxResults: "20",
          orderBy: "startTime",
          singleEvents: "true",
        }),
        { headers: { Authorization: `Bearer ${token.accessToken}` } },
      );
      const data: any = await res.json();
      return { events: data.items || [] };
    } catch {
      return { events: [] };
    }
  }
}
