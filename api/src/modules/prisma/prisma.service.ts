import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private log = new Logger("DB");
  async onModuleInit() {
    try { await this.$connect(); this.log.log("Connected"); }
    catch (e: any) { this.log.warn(`Offline: ${e.message?.slice(0,60)}`); }
  }
}
