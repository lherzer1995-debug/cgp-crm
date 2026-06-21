import { Controller, Get, Post, Query, Req, Res } from "@nestjs/common";
import { GoogleService } from "./google.service";

@Controller("integrations/google")
export class GoogleController {
  constructor(private readonly svc: GoogleService) {}

  @Get("status")
  getStatus() {
    return this.svc.getStatus();
  }

  @Post("auth-url")
  getAuthUrl() {
    return this.svc.getAuthUrl();
  }

  @Get("callback")
  async callback(@Query("code") code: string, @Query("state") state: string, @Res() res: any) {
    const result = await this.svc.handleCallback(code, state);
    if (result.success) {
      return res.redirect(process.env.FRONTEND_URL || "http://localhost:3000");
    }
    return res.status(400).json({ error: result.error });
  }

  @Post("disconnect")
  disconnect() {
    return this.svc.disconnect();
  }

  @Get("events")
  async listEvents(@Query("timeMin") timeMin?: string, @Query("timeMax") timeMax?: string) {
    return this.svc.listEvents(timeMin, timeMax);
  }

  @Post("events")
  async createEvent(@Req() req: any) {
    return this.svc.createEvent(req.body);
  }

  @Get("free-slots")
  async getFreeSlots(@Query("date") date: string, @Query("durationMin") durationMin?: string) {
    return this.svc.findFreeSlots(date, Number(durationMin) || 60);
  }
}
