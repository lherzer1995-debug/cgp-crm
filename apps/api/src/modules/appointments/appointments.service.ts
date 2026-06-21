import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { createEvent, findFreeSlots, getStatus } from "@cgp/calendar";

@Injectable()
export class AppointmentsService {
  constructor(private readonly db: PrismaService) {}

  async findAll() {
    return this.db.appointment.findMany({ orderBy: { startTime: "asc" }, take: 50 });
  }

  async create(data: any) {
    // Create in local DB
    const appt = await this.db.appointment.create({
      data: {
        userId: data.userId,
        customerId: data.customerId,
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        location: data.location,
        aiGenerated: data.aiGenerated || false,
      },
    });

    // Sync to Google Calendar if connected
    const status = getStatus();
    if (status.connected) {
      try {
        const event = await createEvent({
          summary: data.title,
          description: data.description,
          start: data.startTime,
          end: data.endTime,
          location: data.location,
        });
        if (event?.id) {
          await this.db.appointment.update({
            where: { id: appt.id },
            data: { googleEventId: event.id },
          });
        }
      } catch { /* Google sync failed, appointment still saved locally */ }
    }

    return appt;
  }

  async findFreeSlots(date: string, durationMin: number) {
    const status = getStatus();
    if (!status.connected) {
      // Return generic business hours as fallback
      const slots = [];
      for (let h = 8; h < 18; h++) {
        slots.push({
          start: `${date}T${String(h).padStart(2, "0")}:00:00+02:00`,
          end: `${date}T${String(h + 1).padStart(2, "0")}:00:00+02:00`,
        });
      }
      return slots;
    }
    return findFreeSlots(date, durationMin);
  }
}
