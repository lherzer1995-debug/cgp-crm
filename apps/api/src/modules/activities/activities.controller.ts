import { Controller, Get, Post, Patch, Param, Body } from "@nestjs/common";
import { ActivitiesService } from "./activities.service";

@Controller()
export class ActivitiesController {
  constructor(private readonly svc: ActivitiesService) {}

  @Get("activities")
  findAll() {
    return this.svc.findAll();
  }

  @Post("customers/:customerId/activities")
  create(@Param("customerId") customerId: string, @Body() data: any) {
    return this.svc.create(customerId, data);
  }

  @Patch("activities/:id")
  update(@Param("id") id: string, @Body() data: any) {
    return this.svc.update(id, data);
  }
}
