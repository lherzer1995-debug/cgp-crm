import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCustomerDto, UpdateCustomerDto } from "./dto/create-customer.dto";
import { aiChat } from "../../common/utils/ai-client";

@Injectable()
export class CustomersService {
  constructor(private db: PrismaService) {}

  async findAll(filters?: { search?: string; industry?: string }) {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { city: { contains: filters.search, mode: "insensitive" } },
        { contactPerson: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters?.industry) where.industry = filters.industry;
    return this.db.customer.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { activities: true, noteEntries: true, tasks: true } },
      },
    });
  }

  async getStats() {
    const [total, byIndustry, byStatus, activeCount] = await Promise.all([
      this.db.customer.count(),
      this.db.customer.groupBy({ by: ["industry"], _count: true }),
      this.db.customer.groupBy({ by: ["status"], _count: true }),
      this.db.customer.count({ where: { status: "active" } }),
    ]);
    return { total, active: activeCount, byIndustry, byStatus };
  }

  async findOne(id: string) {
    const c = await this.db.customer.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { activities: true, noteEntries: true, tasks: true, appointments: true } },
      },
    });
    if (!c) throw new NotFoundException("Customer not found");
    return c;
  }

  async create(dto: CreateCustomerDto) {
    const { tags, ...data } = dto;
    return this.db.customer.create({
      data: {
        ...data,
        tags: tags?.length
          ? {
              create: await Promise.all(
                tags.map(async (name) => {
                  const tag = await this.db.tag.upsert({
                    where: { name },
                    create: { name, color: "#53bfff" },
                    update: {},
                  });
                  return { tagId: tag.id };
                }),
              ),
            }
          : undefined,
      },
      include: { tags: { include: { tag: true } } },
    });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    const { tags, ...data } = dto;
    if (tags) {
      await this.db.customerTag.deleteMany({ where: { customerId: id } });
      for (const name of tags) {
        const tag = await this.db.tag.upsert({
          where: { name },
          create: { name, color: "#53bfff" },
          update: {},
        });
        await this.db.customerTag.create({ data: { customerId: id, tagId: tag.id } });
      }
    }
    return this.db.customer.update({
      where: { id },
      data,
      include: { tags: { include: { tag: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.db.customer.delete({ where: { id } });
  }

  getActivities(customerId: string) {
    return this.db.activity.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 50 });
  }

  async addActivity(customerId: string, body: { type?: string; title: string }) {
    return this.db.activity.create({ data: { customerId, type: body.type || "note", title: body.title } });
  }

  getCommissions(customerId: string) {
    return this.db.commission.findMany({ where: { customerId }, orderBy: { date: "desc" } });
  }

  getNotes(customerId: string) {
    return this.db.note.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 50 });
  }

  async getSummary(customerId: string) {
    const [notes, activities] = await Promise.all([
      this.db.note.findMany({ where: { customerId }, take: 10, orderBy: { createdAt: "desc" } }),
      this.db.activity.findMany({ where: { customerId }, take: 10 }),
    ]);
    if (notes.length === 0) return { summary: "Noch keine Daten vorhanden." };
    const content = await aiChat(
      "Du bist ein CRM-Assistent. Fasse die Kundendaten in 2-3 Sätzen zusammen. Extrahiere: Gesprächsthemen, offene Punkte, nächste Schritte. Antwort auf Deutsch. Präzise und wertvoll.",
      `Notizen: ${notes.map((n: any) => n.content).join("; ")}. Aktivitäten: ${activities.map((a: any) => a.title).join("; ")}`,
      300,
    );
    return { summary: content };
  }

  async getTimeline(customerId: string) {
    const [notes, activities, appointments, tasks] = await Promise.all([
      this.db.note.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 20 }),
      this.db.activity.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 20 }),
      this.db.appointment.findMany({ where: { customerId }, orderBy: { startTime: "desc" }, take: 20 }),
      this.db.task.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);
    return [
      ...notes.map((n: any) => ({ ...n, _type: "note" as const, _date: n.createdAt })),
      ...activities.map((a: any) => ({ ...a, _type: "activity" as const, _date: a.createdAt })),
      ...appointments.map((a: any) => ({ ...a, _type: "appointment" as const, _date: a.createdAt })),
      ...tasks.map((t: any) => ({ ...t, _type: "task" as const, _date: t.createdAt })),
    ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime());
  }
}
