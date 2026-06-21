import { Controller, Get } from "@nestjs/common";

@Controller()
export class RootController {
  @Get()
  health() {
    return {
      status: "ok",
      app: "CGP CRM",
      version: "1.0.0",
      api: "/api",
      endpoints: "/api/customers",
    };
  }
}
