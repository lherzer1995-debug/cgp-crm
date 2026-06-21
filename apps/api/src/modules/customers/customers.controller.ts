import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from "@nestjs/common";
import { CustomersService } from "./customers.service";

@Controller("customers")
export class CustomersController {
  constructor(private readonly svc: CustomersService) {}

  @Get()
  findAll(@Query("orgId") orgId?: string) {
    return this.svc.findAll(orgId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.svc.create(data);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() data: any) {
    return this.svc.update(id, data);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.svc.remove(id);
  }

  @Get(":id/activities")
  getActivities(@Param("id") id: string) {
    return this.svc.getActivities(id);
  }

  @Get(":id/commissions")
  getCommissions(@Param("id") id: string) {
    return this.svc.getCommissions(id);
  }

  @Get(":id/notes")
  getNotes(@Param("id") id: string) {
    return this.svc.getNotes(id);
  }

  @Post(":id/notes")
  addNote(@Param("id") id: string, @Body() data: { content: string; authorId: string }) {
    return this.svc.addNote(id, data);
  }

  @Get(":id/summary")
  async getAISummary(@Param("id") id: string) {
    return this.svc.getAISummary(id);
  }

  @Get(":id/next-action")
  async getNextAction(@Param("id") id: string) {
    return this.svc.getNextAction(id);
  }

  @Get(":id/churn")
  async getChurnPrediction(@Param("id") id: string) {
    return this.svc.getChurnPrediction(id);
  }
}
