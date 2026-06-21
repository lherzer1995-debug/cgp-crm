import { Module } from "@nestjs/common";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { AiModule } from "./modules/ai/ai.module";
import { CommissionsModule } from "./modules/commissions/commissions.module";
import { RoutesModule } from "./modules/routes/routes.module";

@Module({ imports: [PrismaModule, CustomersModule, AiModule, CommissionsModule, RoutesModule] })
export class AppModule {}
