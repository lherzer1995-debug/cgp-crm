import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import OpenAI from "openai";

const ai = () => {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL || "https://api.deepseek.com/v1" });
};
const MODEL = process.env.AI_MODEL || "deepseek-chat";

@Injectable()
export class CustomersService {
  constructor(private db: PrismaService) {}

  findAll() { return this.db.customer.findMany({ orderBy: { updatedAt: "desc" } }); }

  async findOne(id: string) {
    const c = await this.db.customer.findUnique({ where: { id } });
    if (!c) throw new NotFoundException();
    return c;
  }

  create(d: any) {
    return this.db.customer.create({
      data: {
        name: d.name, contactPerson: d.contact || d.contactPerson,
        email: d.email, phone: d.phone, city: d.city, industry: d.industry,
      },
    });
  }

  async update(id: string, d: any) { await this.findOne(id); return this.db.customer.update({ where: { id }, data: d }); }
  async remove(id: string) { await this.findOne(id); return this.db.customer.delete({ where: { id } }); }

  getActivities(customerId: string) { return this.db.activity.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } }); }

  async addActivity(customerId: string, d: any) {
    return this.db.activity.create({ data: { customerId, type: d.type || "note", title: d.content || d.title || "Activity" } });
  }

  getCommissions(customerId: string) { return this.db.commission.findMany({ where: { customerId }, orderBy: { date: "desc" } }); }

  async getSummary(customerId: string) {
    const notes = await this.db.note.findMany({ where: { customerId }, take: 10, orderBy: { createdAt: "desc" } });
    const activities = await this.db.activity.findMany({ where: { customerId }, take: 10 });
    const client = ai();
    if (!client || notes.length === 0) return { summary: "No data yet." };

    const r = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "system", content: "Fasse diese Kundendaten in 2-3 Sätzen zusammen. Deutsch." }, { role: "user", content: `Notizen: ${notes.map(n=>n.content).join("; ")}. Aktivitäten: ${activities.map(a=>a.title).join("; ")}` }],
      max_tokens: 200,
    });
    return { summary: r.choices[0]?.message?.content || "No summary." };
  }
}
