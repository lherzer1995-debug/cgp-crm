import { Controller, Get, Param } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller()
export class NotesController {
  constructor(private readonly db: PrismaService) {}

  @Get("customers/:customerId/notes")
  getByCustomer(@Param("customerId") customerId: string) {
    return this.db.note.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } });
  }
}
