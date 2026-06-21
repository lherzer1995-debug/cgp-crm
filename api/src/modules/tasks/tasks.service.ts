import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TasksService {
  constructor(private db: PrismaService) {}

  async findAll(filters?: { status?: string; priority?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    return this.db.task.findMany({
      where,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    });
  }

  async findOne(id: string) {
    const t = await this.db.task.findUnique({ where: { id }, include: { customer: true } });
    if (!t) throw new NotFoundException("Task not found");
    return t;
  }

  async create(data: { title: string; description?: string; customerId?: string; priority?: string; dueDate?: string }) {
    return this.db.task.create({
      data: {
        userId: "",
        title: data.title,
        description: data.description,
        customerId: data.customerId,
        priority: data.priority || "medium",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    return this.db.task.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.db.task.delete({ where: { id } });
  }

  async complete(id: string) {
    await this.findOne(id);
    return this.db.task.update({
      where: { id },
      data: { status: "completed", completedAt: new Date() },
    });
  }
}
