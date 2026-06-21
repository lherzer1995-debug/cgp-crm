import { Controller, Get, Post, Param, Body } from "@nestjs/common";
import { RoutesService } from "./routes.service";

@Controller("routes")
export class RoutesController {
  constructor(private readonly svc: RoutesService) {}

  @Get()
  findAll() { return this.svc.findAll(); }

  @Get(":id")
  findOne(@Param("id") id: string) { return this.svc.findOne(id); }

  @Post()
  create(@Body() data: { userId: string; customerIds: string[]; date?: string }) {
    return this.svc.createOptimized(data);
  }

  @Post("optimize")
  optimize(@Body() data: { userId: string; customerIds: string[] }) {
    return this.svc.createOptimized(data);
  }
}
