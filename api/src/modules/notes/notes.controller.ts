import { Controller, Get, Post, Param, Body } from "@nestjs/common";
import { NotesService } from "./notes.service";

@Controller("notes")
export class NotesController {
  constructor(private svc: NotesService) {}

  @Get("customer/:customerId")
  findByCustomer(@Param("customerId") customerId: string) {
    return this.svc.findByCustomer(customerId);
  }

  @Post()
  create(@Body() body: { customerId: string; content: string; rawContent?: string }) {
    return this.svc.create(body);
  }
}
