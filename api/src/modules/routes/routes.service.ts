import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RoutesService {
  constructor(private db: PrismaService) {}

  findAll() {
    return this.db.route.findMany({
      include: { stops: { include: { customer: true }, orderBy: { sortOrder: "asc" } } },
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: string) {
    const r = await this.db.route.findUnique({
      where: { id },
      include: { stops: { include: { customer: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!r) throw new NotFoundException("Route not found");
    return r;
  }

  findByDate(date: string) {
    const d = new Date(date);
    return this.db.route.findMany({
      where: {
        date: {
          gte: new Date(d.setHours(0, 0, 0, 0)),
          lte: new Date(d.setHours(23, 59, 59, 999)),
        },
      },
      include: { stops: { include: { customer: true }, orderBy: { sortOrder: "asc" } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.db.route.delete({ where: { id } });
  }
}
