import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { aiChat } from "../../common/utils/ai-client";

@Injectable()
export class AiService {
  private log = new Logger("AI");

  constructor(private db: PrismaService) {}

  async getStats() {
    const [totalCustomers, openTasks, todayAppointments, highPriority] = await Promise.all([
      this.db.customer.count(),
      this.db.task.count({ where: { status: { not: "completed" } } }),
      this.db.appointment.count({
        where: {
          startTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          endTime: { lte: new Date(new Date().setHours(23, 59, 59, 999)) },
        },
      }),
      this.db.customer.count({ where: { priority: { gte: 4 } } }),
    ]);
    return { totalCustomers, openTasks, todayAppointments, highPriority };
  }

  async getBriefing() {
    const [total, tasks, todayApps, upcoming] = await Promise.all([
      this.db.customer.count(),
      this.db.task.count({ where: { status: { not: "completed" } } }),
      this.db.appointment.count({
        where: {
          startTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          endTime: { lte: new Date(new Date().setHours(23, 59, 59, 999)) },
        },
      }),
      this.db.appointment.findMany({
        where: {
          startTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          endTime: { lte: new Date(new Date().setHours(23, 59, 59, 999)) },
        },
        include: { customer: true },
        orderBy: { startTime: "asc" },
        take: 5,
      }),
    ]);

    const appointmentList = (upcoming as any[])
      .map((a: any) => `${a.startTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} – ${a.customer?.name || a.title}`)
      .join("\n");

    const content = await aiChat(
      "Du bist ein luxuriöser KI-Executive-Assistant. Erstelle ein elegantes, motivierendes Daily Briefing. Maximal 4 Sätze, Deutsch. Stil: premium, klar, wertvoll.",
      `Kunden: ${total} | Offene Tasks: ${tasks} | Termine heute: ${todayApps}\n\nTermine:\n${appointmentList || "Keine Termine"}`,
      300,
    );
    return { briefing: content, stats: { total, tasks, todayApps } };
  }

  async processNote(customerId: string, rawContent: string) {
    const customer = await this.db.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new Error("Customer not found");

    const result = await aiChat(
      `Du bist ein KI-Notiz-Assistent. Verarbeite folgende rohe Notiz eines Außendienstmitarbeiters.
Extrahiere im JSON-Format:
{
  "cleanedNote": "Die bereinigte, professionelle Notiz",
  "summary": "Eine 1-Satz-Zusammenfassung",
  "actionItems": ["Aktion 1", "Aktion 2"],
  "followUp": true/false,
  "followUpDate": "YYYY-MM-DD oder null",
  "urgency": "low|normal|high|urgent",
  "sentiment": "positive|neutral|negative",
  "opportunities": ["Möglichkeit 1"]
}
Antwort NUR mit gültigem JSON. Keine Erklärung.`,
      `Kunde: ${customer.name}\nRoh-Notiz: ${rawContent}`,
      600,
    );

    let parsed: any = {};
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { cleanedNote: result };
    } catch {
      parsed = { cleanedNote: rawContent, summary: "Verarbeitung fehlgeschlagen." };
    }

    const note = await this.db.note.create({
      data: {
        customerId,
        authorId: "",
        content: parsed.cleanedNote || rawContent,
        rawContent,
        summary: parsed.summary,
        actionItems: parsed.actionItems || [],
        followUp: parsed.followUp || false,
        followUpDate: parsed.followUpDate ? new Date(parsed.followUpDate) : null,
        urgency: parsed.urgency || "normal",
        sentiment: parsed.sentiment,
        aiProcessed: true,
      },
    });

    if (parsed.actionItems?.length) {
      await this.db.task.createMany({
        data: parsed.actionItems.map((item: string) => ({
          userId: "",
          customerId,
          title: item,
          priority: parsed.urgency === "urgent" ? "high" : "medium",
          aiGenerated: true,
          sourceNoteId: note.id,
          dueDate: parsed.followUpDate ? new Date(parsed.followUpDate) : null,
        })),
      });
    }

    await this.db.activity.create({
      data: { customerId, type: "note", title: parsed.summary || "Notiz erstellt", aiGenerated: true },
    });

    if (parsed.followUp) {
      await this.db.aISuggestion.create({
        data: {
          userId: "",
          type: "follow-up",
          title: "Folgetermin empfohlen",
          content: `KI empfiehlt Folgetermin bei ${customer.name}: ${parsed.summary}`,
          priority: parsed.urgency === "urgent" ? 5 : 3,
        },
      });
    }

    return { note, analysis: parsed };
  }

  async suggestTasks() {
    const customers = await this.db.customer.findMany({
      where: { status: "active" },
      take: 10,
      orderBy: { updatedAt: "asc" },
    });
    return customers
      .filter((c: any) => c.lastVisit && c.visitFrequency)
      .map((c: any) => {
        const daysSince = Math.floor((Date.now() - new Date(c.lastVisit!).getTime()) / (1000 * 60 * 60 * 24));
        return {
          title: `Besuch bei ${c.name} ${daysSince >= c.visitFrequency! ? "überfällig" : "bald fällig"}`,
          description: `${daysSince} Tage seit letztem Besuch (Intervall: ${c.visitFrequency} Tage)`,
          priority: daysSince > c.visitFrequency! * 1.5 ? "high" : "medium",
        };
      });
  }

  async optimizeRoute(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));

    const appointments = await this.db.appointment.findMany({
      where: {
        startTime: { gte: startOfDay },
        endTime: { lte: new Date(targetDate.setHours(23, 59, 59, 999)) },
      },
      include: { customer: true },
      orderBy: { startTime: "asc" },
    });

    const customersWithLocation = appointments
      .filter((a: any) => a.customer?.latitude && a.customer?.longitude)
      .map((a: any) => ({
        id: a.customer!.id,
        name: a.customer!.name,
        lat: a.customer!.latitude!,
        lng: a.customer!.longitude!,
        appointmentTime: a.startTime,
        appointmentId: a.id,
      }));

    const optimized = [...customersWithLocation];
    if (optimized.length > 1) {
      for (let i = 1; i < optimized.length; i++) {
        let minIdx = i;
        for (let j = i + 1; j < optimized.length; j++) {
          const distCurrent = this.haversine(optimized[i - 1].lat, optimized[i - 1].lng, optimized[j].lat, optimized[j].lng);
          const distMin = this.haversine(optimized[i - 1].lat, optimized[i - 1].lng, optimized[minIdx].lat, optimized[minIdx].lng);
          if (distCurrent < distMin) minIdx = j;
        }
        [optimized[i], optimized[minIdx]] = [optimized[minIdx], optimized[i]];
      }
    }

    const route = await this.db.route.create({
      data: {
        userId: "",
        name: `Route ${startOfDay.toLocaleDateString("de-DE")}`,
        date: startOfDay,
        optimized: true,
        stops: { create: optimized.map((stop, idx) => ({ customerId: stop.id, sortOrder: idx, estimatedArrival: stop.appointmentTime })) },
      },
      include: { stops: { include: { customer: true } } },
    });

    return route;
  }

  async generateDailyPlan(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));

    const [tasks, appointments, overdueTasks] = await Promise.all([
      this.db.task.findMany({
        where: { status: { not: "completed" }, priority: { in: ["high", "urgent"] } },
        include: { customer: true },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
      this.db.appointment.findMany({
        where: { startTime: { gte: startOfDay }, endTime: { lte: new Date(targetDate.setHours(23, 59, 59, 999)) } },
        include: { customer: true },
        orderBy: { startTime: "asc" },
      }),
      this.db.task.count({ where: { status: { not: "completed" }, dueDate: { lt: new Date() } } }),
    ]);

    const plan = {
      date: startOfDay.toISOString().split("T")[0],
      appointments: (appointments as any[]).map((a: any) => ({
        time: a.startTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
        customer: a.customer?.name || "Unbekannt",
        title: a.title,
      })),
      priorityTasks: (tasks as any[]).map((t: any) => ({
        title: t.title,
        customer: t.customer?.name,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString().split("T")[0],
      })),
      overdueCount: overdueTasks,
      summary: `${appointments.length} Termine, ${tasks.length} prioritäre Aufgaben, ${overdueTasks} überfällig`,
    };

    await this.db.dailyPlan.upsert({
      where: { userId_date: { userId: "", date: startOfDay } },
      create: { userId: "", date: startOfDay, content: plan as any, aiGenerated: true },
      update: { content: plan as any, aiGenerated: true },
    });

    return plan;
  }

  async getSuggestions() {
    return this.db.aISuggestion.findMany({ where: { read: false }, orderBy: { priority: "desc" }, take: 20 });
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
