import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotesService {
  constructor(private db: PrismaService) {}

  findByCustomer(customerId: string) {
    return this.db.note.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async create(data: { customerId: string; content: string; rawContent?: string }) {
    return this.db.note.create({
      data: {
        customerId: data.customerId,
        authorId: "",
        content: data.content,
        rawContent: data.rawContent,
      },
    });
  }
}
