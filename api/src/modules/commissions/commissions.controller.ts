import { Controller, Post, Body } from "@nestjs/common";
import { CommissionsService } from "./commissions.service";
@Controller("commissions")
export class CommissionsController {
  constructor(private svc: CommissionsService) {}
  @Post() create(@Body() d: any) { return this.svc.create(d); }
}
