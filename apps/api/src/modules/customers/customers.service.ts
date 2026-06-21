import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { summarizeCustomer, suggestNextAction, predictChurn, polishNote } from "@cgp/ai";

@Injectable()
export class CustomersService {
  constructor(private readonly db: PrismaService) {}

  async findAll(orgId?: string) {
    return this.db.customer.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      include: { tags: { include: { tag: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findOne(id: string) {
    const c = await this.db.customer.findUnique({ where: { id }, include: { tags: { include: { tag: true } } } });
    if (!c) throw new NotFoundException("Customer not found");
    return c;
  }

  async create(data: any) {
    return this.db.customer.create({
      data: {
        name: data.name,
        contactPerson: data.contact,
        email: data.email,
        phone: data.phone,
        city: data.city,
        industry: data.industry,
        address: data.address,
        organizationId: data.organizationId || "default",
      },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.db.customer.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.db.customer.delete({ where: { id } });
  }

  async getActivities(customerId: string) {
    return this.db.activity.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } });
  }

  async getCommissions(customerId: string) {
    return this.db.commission.findMany({ where: { customerId }, orderBy: { date: "desc" } });
  }

  async getNotes(customerId: string) {
    return this.db.note.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } });
  }

  async addNote(customerId: string, data: { content: string; authorId: string }) {
    const polished = await polishNote(data.content);

    const note = await this.db.note.create({
      data: {
        customerId,
        authorId: data.authorId,
        content: polished.cleanedText,
        rawContent: data.content,
        sentiment: polished.sentiment as any,
      },
    });

    // Auto-create AI tasks
    for (const task of polished.extractedTasks) {
      await this.db.activity.create({
        data: {
          customerId,
          title: task.title,
          type: "TASK",
          priority: task.priority as any,
          dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
          aiGenerated: true,
        },
      });
    }

    // Save AI summary
    await this.db.aISummary.upsert({
      where: { id: `${customerId}-latest` },
      update: { summary: polished.summary, keyPoints: polished.followUps },
      create: { id: `${customerId}-latest`, customerId, summary: polished.summary, keyPoints: polished.followUps },
    });

    return note;
  }

  async getAISummary(customerId: string) {
    const notes = await this.db.note.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 20 });
    const activities = await this.db.activity.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 20 });

    if (notes.length === 0) return { summary: "No data available yet." };

    const summary = await summarizeCustomer(
      notes.map((n) => n.content),
      activities.map((a) => `${a.type}: ${a.title}`)
    );

    return { summary };
  }

  async getNextAction(customerId: string) {
    const customer = await this.findOne(customerId);
    const recentNotes = await this.db.note.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 5 });

    return suggestNextAction({
      name: customer.name,
      status: customer.status,
      recentNotes: recentNotes.map((n) => n.content),
    });
  }

  async getChurnPrediction(customerId: string) {
    const customer = await this.findOne(customerId);
    const notes = await this.db.note.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 10 });

    return predictChurn({
      name: customer.name,
      status: customer.status,
      contractEnd: customer.contractEnd?.toISOString(),
      notes: notes.map((n) => n.content),
    });
  }
}
