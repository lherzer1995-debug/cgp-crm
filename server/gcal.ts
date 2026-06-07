/**
 * Google Calendar Integration
 * 
 * Since the GCal connector runs through Perplexity's tool bridge (not available
 * in published sites), we use a lightweight webhook approach:
 * The CRM calls back to a Perplexity-hosted endpoint that creates the calendar event.
 * 
 * In production, this is handled via the GCAL_WEBHOOK_URL env variable
 * which points to an n8n workflow or Perplexity webhook.
 */

export interface CalendarEventPayload {
  title: string;
  description: string;
  startDateTime: string; // ISO 8601
  endDateTime: string;   // ISO 8601
  customerName: string;
  activityType: string;
}

/**
 * Creates a Google Calendar event via the configured webhook URL.
 * Falls back gracefully if not configured.
 */
export async function createCalendarEvent(payload: CalendarEventPayload): Promise<{ success: boolean; message: string; eventId?: string }> {
  const webhookUrl = process.env.GCAL_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log("[GCal] GCAL_WEBHOOK_URL not set — skipping calendar sync");
    return { success: false, message: "Google Calendar nicht konfiguriert" };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Webhook error ${res.status}: ${text}`);
    }
    
    const data = await res.json().catch(() => ({}));
    return { success: true, message: "Kalendereintrag erstellt", eventId: data.eventId };
  } catch (err: any) {
    console.error("[GCal] Error:", err.message);
    return { success: false, message: err.message };
  }
}
