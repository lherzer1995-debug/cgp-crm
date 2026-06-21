import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly db: PrismaService) {}

  async getOverview(orgId?: string) {
    const whereCustomer = orgId ? { organizationId: orgId } : {};

    const [totalCustomers, activeCustomers, openTasks, todayAppointments, recentActivities, topCustomers, totalCommissions] = await Promise.all([
      this.db.customer.count({ where: whereCustomer }),
      this.db.customer.count({ where: { ...whereCustomer, status: "ACTIVE" } }),
      this.db.activity.count({ where: { status: { in: ["TODO", "IN_PROGRESS"] } } }),
      this.db.appointment.count({
        where: {
          startTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          endTime: { lte: new Date(new Date().setHours(23, 59, 59, 999)) },
        },
      }),
      this.db.activity.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      this.db.customer.findMany({ where: whereCustomer, orderBy: { riskScore: "desc" }, take: 5 }),
      this.db.commission.aggregate({ _sum: { amount: true } }),
    ]);

    return {
      totalCustomers,
      activeCustomers,
      openTasks,
      todayAppointments,
      totalCommissions: totalCommissions._sum?.amount || 0,
      recentActivities,
      topCustomers,
    };
  }
}
