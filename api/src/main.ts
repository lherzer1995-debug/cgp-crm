import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix("api", { exclude: ["/"] }); // root stays without prefix
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Use fixed internal port for API
  const port = 5000;
  await app.listen(port, "0.0.0.0");
  console.log(`CGP CRM API ready on port ${port}`);
}
bootstrap();
