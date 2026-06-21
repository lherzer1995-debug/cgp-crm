import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from "@nestjs/common";
import { AppointmentsService } from "./appointments.service";

@Controller("appointments")
export class AppointmentsController {
  constructor(private svc: AppointmentsService) {}

  @Get()
  findAll(@Query("date") date?: string) {
    return this.svc.findAll(date);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.svc.remove(id);
  }
}
