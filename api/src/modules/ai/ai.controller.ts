import { Controller, Get } from "@nestjs/common";
import { AiService } from "./ai.service";

@Controller("ai")
export class AiController {
  constructor(private svc: AiService) {}
  @Get("stats") stats() { return this.svc.getStats(); }
  @Get("briefing") briefing() { return this.svc.getBriefing(); }
}
