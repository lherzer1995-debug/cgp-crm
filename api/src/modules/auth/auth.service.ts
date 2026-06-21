import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  private log = new Logger("Auth");

  constructor(private db: PrismaService) {}

  async handleClerkWebhook(body: any) {
    const { type, data } = body;
    this.log.log(`Webhook: ${type}`);

    if (type === "user.created" || type === "user.updated") {
      await this.db.user.upsert({
        where: { clerkId: data.id },
        create: {
          clerkId: data.id,
          email: data.email_addresses?.[0]?.email_address || "",
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
          avatarUrl: data.image_url,
        },
        update: {
          email: data.email_addresses?.[0]?.email_address,
          name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
          avatarUrl: data.image_url,
        },
      });
    }

    if (type === "user.deleted") {
      await this.db.user.deleteMany({ where: { clerkId: data.id } });
    }

    if (type === "organization.created") {
      await this.db.organization.create({
        data: {
          name: data.name,
          slug: data.slug,
        },
      });
    }

    return { received: true };
  }
}
