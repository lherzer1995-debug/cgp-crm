import { Controller, Get, Post, Param, Delete } from "@nestjs/common";
import { RoutesService } from "./routes.service";

@Controller("routes")
export class RoutesController {
  constructor(private svc: RoutesService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.svc.findOne(id);
  }

  @Get("date/:date")
  findByDate(@Param("date") date: string) {
    return this.svc.findByDate(date);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.svc.remove(id);
  }
}
