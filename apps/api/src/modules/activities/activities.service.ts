import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ActivitiesService {
  constructor(private readonly db: PrismaService) {}

  async findAll() {
    return this.db.activity.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  }

  async create(customerId: string, data: any) {
    return this.db.activity.create({
      data: {
        customerId,
        title: data.content || data.title,
        type: data.type || "NOTE",
        priority: data.priority || "MEDIUM",
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  }

  async update(id: string, data: any) {
    return this.db.activity.update({ where: { id }, data });
  }
}
