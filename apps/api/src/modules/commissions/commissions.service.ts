import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CommissionsService {
  constructor(private readonly db: PrismaService) {}

  async findByCustomer(customerId: string) {
    return this.db.commission.findMany({ where: { customerId }, orderBy: { date: "desc" } });
  }

  async create(data: any) {
    return this.db.commission.create({
      data: {
        customerId: data.customerId,
        amount: parseFloat(data.amount),
        type: data.type || "SALE",
        description: data.description,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });
  }
}
