import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
@Injectable()
export class RoutesService {
  constructor(private db: PrismaService) {}
  findAll() { return this.db.route.findMany({ include: { stops: { include: { customer: true } } } }); }
}
