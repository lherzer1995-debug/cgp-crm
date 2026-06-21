import { Controller, Get, Post, Param, Body, Query } from "@nestjs/common";
import { CalendarService } from "./calendar.service";

@Controller("calendar")
export class CalendarController {
  constructor(private svc: CalendarService) {}

  @Get("auth-url")
  authUrl() {
    return this.svc.getAuthUrl();
  }

  @Get("callback")
  callback(@Query("code") code: string) {
    return this.svc.handleCallback(code);
  }

  @Post("sync")
  sync(@Body() body: { appointmentId: string }) {
    return this.svc.syncToCalendar(body.appointmentId);
  }

  @Get("events")
  listEvents() {
    return this.svc.listEvents();
  }
}
