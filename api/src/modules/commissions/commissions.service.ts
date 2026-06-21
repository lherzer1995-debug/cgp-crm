import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
@Injectable()
export class CommissionsService {
  constructor(private db: PrismaService) {}
  create(d: any) { return this.db.commission.create({ data: { customerId: d.customerId, amount: parseFloat(d.amount), type: d.type || "sale", date: d.date ? new Date(d.date) : new Date() } }); }
}
