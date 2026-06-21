import { Controller, Get, Post, Param, Body } from "@nestjs/common";
import { CommissionsService } from "./commissions.service";

@Controller()
export class CommissionsController {
  constructor(private readonly svc: CommissionsService) {}

  @Get("customers/:customerId/commissions")
  getByCustomer(@Param("customerId") customerId: string) {
    return this.svc.findByCustomer(customerId);
  }

  @Post("commissions")
  create(@Body() data: any) {
    return this.svc.create(data);
  }
}
