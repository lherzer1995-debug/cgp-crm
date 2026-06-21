import { Injectable } from "@nestjs/common";
import { createAuthUrl, exchangeCode, disconnect, getStatus, listEvents, createEvent, findFreeSlots, CalendarEvent } from "@cgp/calendar";

@Injectable()
export class GoogleService {
  getStatus() { return getStatus(); }
  getAuthUrl() { return { url: createAuthUrl() }; }

  async handleCallback(code: string, state: string) {
    const result = await exchangeCode(code);
    if (!result) return { success: false, error: "Token exchange failed" };
    return { success: true };
  }

  disconnect() { return disconnect(); }
  async listEvents(timeMin?: string, timeMax?: string) { return listEvents(timeMin, timeMax); }
  async createEvent(data: CalendarEvent) { return createEvent(data); }
  async findFreeSlots(date: string, durationMin: number) { return findFreeSlots(date, durationMin); }
}
