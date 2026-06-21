import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import OpenAI from "openai";

const ai = () => process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: "https://api.deepseek.com/v1" }) : null;
const M = "deepseek-chat";

@Injectable()
export class AiService {
  constructor(private db: PrismaService) {}

  async getStats() {
    const [totalCustomers, openActivities, commissions] = await Promise.all([
      this.db.customer.count(),
      this.db.activity.count({ where: { done: false } }),
      this.db.commission.aggregate({ _sum: { amount: true } }),
    ]);
    return { totalCustomers, openActivities, totalCommissions: commissions._sum.amount || 0 };
  }

  async getBriefing() {
    const client = ai();
    if (!client) return { briefing: "Guten Morgen! Setze OPENAI_API_KEY für KI-Briefings." };

    const [total, tasks, todayApps] = await Promise.all([
      this.db.customer.count(),
      this.db.activity.count({ where: { done: false } }),
      this.db.appointment.count({ where: { startTime: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
    ]);

    const r = await client.chat.completions.create({
      model: M, max_tokens: 200,
      messages: [{ role: "system", content: "Premium Executive Briefing. 2-3 motivierende Sätze. Deutsch." }, { role: "user", content: `${total} Kunden, ${tasks} offene Tasks, ${todayApps} heutige Termine.` }],
    });
    return { briefing: r.choices[0]?.message?.content || "Guten Morgen." };
  }
}
