import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AppointmentsService {
  constructor(private db: PrismaService) {}

  async findAll(date?: string) {
    const where: any = {};
    if (date) {
      const d = new Date(date);
      where.startTime = {
        gte: new Date(d.setHours(0, 0, 0, 0)),
        lte: new Date(d.setHours(23, 59, 59, 999)),
      };
    }
    return this.db.appointment.findMany({
      where,
      include: { customer: { select: { id: true, name: true, city: true } } },
      orderBy: { startTime: "asc" },
    });
  }

  async findOne(id: string) {
    const a = await this.db.appointment.findUnique({ where: { id }, include: { customer: true } });
    if (!a) throw new NotFoundException("Appointment not found");
    return a;
  }

  async create(data: {
    title: string; description?: string; customerId?: string;
    startTime: string; endTime: string; location?: string;
  }) {
    return this.db.appointment.create({
      data: {
        userId: "",
        title: data.title,
        description: data.description,
        customerId: data.customerId,
        location: data.location,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    if (data.startTime) data.startTime = new Date(data.startTime);
    if (data.endTime) data.endTime = new Date(data.endTime);
    return this.db.appointment.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.db.appointment.delete({ where: { id } });
  }
}
