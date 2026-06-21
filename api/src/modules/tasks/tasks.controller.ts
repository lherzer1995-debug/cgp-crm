import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from "@nestjs/common";
import { TasksService } from "./tasks.service";

@Controller("tasks")
export class TasksController {
  constructor(private svc: TasksService) {}

  @Get()
  findAll(@Query("status") status?: string, @Query("priority") priority?: string) {
    return this.svc.findAll({ status, priority });
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

  @Patch(":id/complete")
  complete(@Param("id") id: string) {
    return this.svc.complete(id);
  }
}
