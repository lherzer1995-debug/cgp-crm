import { Controller, Get, Post, Body } from "@nestjs/common";
import { AiService } from "./ai.service";

@Controller("ai")
export class AiController {
  constructor(private svc: AiService) {}

  @Get("stats")
  stats() {
    return this.svc.getStats();
  }

  @Get("briefing")
  briefing() {
    return this.svc.getBriefing();
  }

  @Post("process-note")
  processNote(@Body() body: { customerId: string; content: string }) {
    return this.svc.processNote(body.customerId, body.content);
  }

  @Post("suggest-tasks")
  suggestTasks() {
    return this.svc.suggestTasks();
  }

  @Post("optimize-route")
  optimizeRoute(@Body() body: { date?: string }) {
    return this.svc.optimizeRoute(body.date);
  }

  @Post("daily-plan")
  dailyPlan(@Body() body: { date?: string }) {
    return this.svc.generateDailyPlan(body.date);
  }

  @Get("suggestions")
  suggestions() {
    return this.svc.getSuggestions();
  }
}
