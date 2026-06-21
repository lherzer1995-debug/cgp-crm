import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { CustomersModule } from "../customers/customers.module";

@Module({
  imports: [CustomersModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
