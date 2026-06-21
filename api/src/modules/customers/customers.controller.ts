import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from "@nestjs/common";
import { CustomersService } from "./customers.service";

@Controller("customers")
export class CustomersController {
  constructor(private svc: CustomersService) {}

  @Get() findAll() { return this.svc.findAll(); }
  @Get(":id") findOne(@Param("id") id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() d: any) { return this.svc.create(d); }
  @Patch(":id") update(@Param("id") id: string, @Body() d: any) { return this.svc.update(id, d); }
  @Delete(":id") remove(@Param("id") id: string) { return this.svc.remove(id); }
  @Get(":id/activities") activities(@Param("id") id: string) { return this.svc.getActivities(id); }
  @Post(":id/activities") addActivity(@Param("id") id: string, @Body() d: any) { return this.svc.addActivity(id, d); }
  @Get(":id/commissions") commissions(@Param("id") id: string) { return this.svc.getCommissions(id); }
  @Get(":id/summary") summary(@Param("id") id: string) { return this.svc.getSummary(id); }
}
