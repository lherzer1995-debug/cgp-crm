import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OrganizationsService {
  constructor(private db: PrismaService) {}

  findAll() {
    return this.db.organization.findMany();
  }

  findBySlug(slug: string) {
    return this.db.organization.findUnique({
      where: { slug },
      include: { customers: true, users: { include: { user: true } } },
    });
  }

  create(data: { name: string; slug: string }) {
    return this.db.organization.create({ data });
  }
}
