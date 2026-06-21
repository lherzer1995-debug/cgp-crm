import { Controller, Get, Query } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get()
  getOverview(@Query("orgId") orgId?: string) {
    return this.svc.getOverview(orgId);
  }
}
