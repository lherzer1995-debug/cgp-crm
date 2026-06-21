import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UsePipes, ValidationPipe,
} from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto, UpdateCustomerDto } from "./dto/create-customer.dto";

@Controller("customers")
export class CustomersController {
  constructor(private svc: CustomersService) {}

  @Get()
  findAll(@Query("search") search?: string, @Query("industry") industry?: string) {
    return this.svc.findAll({ search, industry });
  }

  @Get("stats")
  stats() {
    return this.svc.getStats();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  create(@Body() dto: CreateCustomerDto) {
    return this.svc.create(dto);
  }

  @Patch(":id")
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(@Param("id") id: string, @Body() dto: UpdateCustomerDto) {
    return this.svc.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.svc.remove(id);
  }

  @Get(":id/activities")
  getActivities(@Param("id") id: string) {
    return this.svc.getActivities(id);
  }

  @Post(":id/activities")
  addActivity(@Param("id") id: string, @Body() body: { type?: string; title: string }) {
    return this.svc.addActivity(id, body);
  }

  @Get(":id/commissions")
  getCommissions(@Param("id") id: string) {
    return this.svc.getCommissions(id);
  }

  @Get(":id/notes")
  getNotes(@Param("id") id: string) {
    return this.svc.getNotes(id);
  }

  @Get(":id/summary")
  getSummary(@Param("id") id: string) {
    return this.svc.getSummary(id);
  }

  @Get(":id/timeline")
  getTimeline(@Param("id") id: string) {
    return this.svc.getTimeline(id);
  }
}
