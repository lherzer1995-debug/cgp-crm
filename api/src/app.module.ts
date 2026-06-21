import { Module } from "@nestjs/common";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { AiModule } from "./modules/ai/ai.module";
import { CommissionsModule } from "./modules/commissions/commissions.module";
import { RoutesModule } from "./modules/routes/routes.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { NotesModule } from "./modules/notes/notes.module";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { CalendarModule } from "./modules/calendar/calendar.module";
import { MapsModule } from "./modules/maps/maps.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { AuthModule } from "./modules/auth/auth.module";
import { RootModule } from "./modules/root/root.module";

@Module({
  imports: [
    RootModule,
    PrismaModule,
    CustomersModule,
    AiModule,
    CommissionsModule,
    RoutesModule,
    TasksModule,
    NotesModule,
    AppointmentsModule,
    CalendarModule,
    MapsModule,
    OrganizationsModule,
    AuthModule,
  ],
})
export class AppModule {}
