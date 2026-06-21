import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { optimizeRoute, isConfigured } from "@cgp/maps";

@Injectable()
export class RoutesService {
  constructor(private readonly db: PrismaService) {}

  async findAll() {
    return this.db.route.findMany({
      include: { stops: { include: { customer: true } } },
      orderBy: { date: "desc" },
    });
  }

  async findOne(id: string) {
    const r = await this.db.route.findUnique({ where: { id }, include: { stops: { include: { customer: true }, orderBy: { sortOrder: "asc" } } } });
    if (!r) throw new NotFoundException("Route not found");
    return r;
  }

  async createOptimized(data: { userId: string; customerIds: string[]; date?: string }) {
    // Get customers with coordinates
    const customers = await this.db.customer.findMany({
      where: { id: { in: data.customerIds } },
      select: { id: true, name: true, latitude: true, longitude: true, address: true, city: true },
    });

    // Create route
    const route = await this.db.route.create({
      data: {
        userId: data.userId,
        name: `Route ${new Date().toLocaleDateString("de-DE")}`,
        date: data.date ? new Date(data.date) : new Date(),
        status: "PLANNED",
        optimizedByAI: false,
      },
    });

    // Try Google Maps optimization if configured
    const withCoords = customers.filter(c => c.latitude && c.longitude);
    let optimized: any = null;

    if (isConfigured() && withCoords.length >= 2) {
      const origin = { lat: withCoords[0]!.latitude!, lng: withCoords[0]!.longitude! };
      const waypoints = withCoords.map(c => ({ id: c.id, lat: c.latitude!, lng: c.longitude! }));
      optimized = await optimizeRoute(origin, waypoints);
    }

    // Create stops
    const ordered = optimized
      ? optimized.legs.map((leg: any) => customers.find(c => c.id === leg.customerId)).filter(Boolean)
      : customers;

    for (let i = 0; i < ordered.length; i++) {
      const c = ordered[i]!;
      const leg = optimized?.legs?.[i];
      await this.db.routeStop.create({
        data: {
          routeId: route.id,
          customerId: c.id,
          sortOrder: i + 1,
          estimatedArrival: leg ? new Date(Date.now() + leg.durationMin * 60000 * (i + 1)) : undefined,
        },
      });
    }

    // Update route with optimization results
    if (optimized) {
      await this.db.route.update({
        where: { id: route.id },
        data: {
          polyline: optimized.polyline,
          totalDistanceKm: optimized.totalKm,
          totalDurationMin: optimized.totalMin,
          optimizedByAI: true,
        },
      });
    }

    return this.findOne(route.id);
  }
}
