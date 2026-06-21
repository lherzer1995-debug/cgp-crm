import { Module } from "@nestjs/common";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { CustomersModule } from "./modules/customers/customers.module";
import { ActivitiesModule } from "./modules/activities/activities.module";
import { CommissionsModule } from "./modules/commissions/commissions.module";
import { NotesModule } from "./modules/notes/notes.module";
import { AiModule } from "./modules/ai/ai.module";
import { RoutesModule } from "./modules/routes/routes.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { GoogleModule } from "./modules/google/google.module";
import { PrismaModule } from "./modules/prisma/prisma.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    CustomersModule,
    ActivitiesModule,
    CommissionsModule,
    NotesModule,
    AiModule,
    RoutesModule,
    AppointmentsModule,
    DashboardModule,
    GoogleModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
