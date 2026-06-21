import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { semanticSearch, generateDailyBriefing } from "@cgp/ai";

@Injectable()
export class AiService {
  constructor(private readonly db: PrismaService) {}

  async getStats() {
    const [totalCustomers, openActivities, commissions] = await Promise.all([
      this.db.customer.count(),
      this.db.activity.count({ where: { status: { in: ["TODO", "IN_PROGRESS"] } } }),
      this.db.commission.aggregate({ _sum: { amount: true } }),
    ]);

    return {
      totalCustomers,
      openActivities,
      totalCommissions: commissions._sum.amount || 0,
    };
  }

  async search(query: string, orgId?: string) {
    if (!query?.trim()) return { ids: [], summary: "Empty query" };

    const customers = await this.db.customer.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      select: { id: true, name: true, city: true, industry: true, notes: true },
    });

    return semanticSearch(
      query,
      customers.map((c) => ({ ...c, notes: c.notes || undefined }))
    );
  }

  async briefing(orgId?: string) {
    const [totalCustomers, openTasks, todayAppointments, highRiskCustomers] = await Promise.all([
      this.db.customer.count({ where: orgId ? { organizationId: orgId } : undefined }),
      this.db.activity.count({ where: { status: { in: ["TODO", "IN_PROGRESS"] } } }),
      this.db.appointment.count({
        where: {
          startTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          endTime: { lte: new Date(new Date().setHours(23, 59, 59, 999)) },
        },
      }),
      this.db.customer.count({ where: { riskScore: { gte: 50 } } }),
    ]);

    return generateDailyBriefing({
      totalCustomers,
      openTasks,
      todayAppointments,
      highRiskCustomers,
      upcomingRenewals: 0,
    });
  }
}
