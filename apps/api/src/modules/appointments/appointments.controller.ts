import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { AppointmentsService } from "./appointments.service";

@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  @Get()
  findAll() { return this.svc.findAll(); }

  @Post()
  create(@Body() data: any) { return this.svc.create(data); }

  @Get("free-slots")
  freeSlots(@Query("date") date: string, @Query("durationMin") durationMin?: string) {
    return this.svc.findFreeSlots(date, Number(durationMin) || 60);
  }
}
