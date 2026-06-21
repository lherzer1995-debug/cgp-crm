import { Controller, Get } from "@nestjs/common";
import { RoutesService } from "./routes.service";
@Controller("routes")
export class RoutesController {
  constructor(private svc: RoutesService) {}
  @Get() findAll() { return this.svc.findAll(); }
}
