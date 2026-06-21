import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Health check at root
  app.use("/", (_req: any, res: any) => {
    res.json({
      status: "ok",
      app: "CGP CRM",
      version: "1.0.0",
      api: "/api",
      docs: "/api/customers",
    });
  });

  // Railway internal port
  await app.listen(5000, "0.0.0.0");
  console.log(`CGP CRM API ready on port 5000`);
}
bootstrap();
