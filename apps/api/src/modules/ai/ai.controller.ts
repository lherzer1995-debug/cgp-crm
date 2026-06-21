import { Controller, Get, Query } from "@nestjs/common";
import { AiService } from "./ai.service";

@Controller("ai")
export class AiController {
  constructor(private readonly svc: AiService) {}

  @Get("stats")
  getStats() {
    return this.svc.getStats();
  }

  @Get("search")
  search(@Query("q") q: string, @Query("orgId") orgId?: string) {
    return this.svc.search(q, orgId);
  }

  @Get("briefing")
  briefing(@Query("orgId") orgId?: string) {
    return this.svc.briefing(orgId);
  }
}
