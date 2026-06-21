import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const log = new Logger("Bootstrap");

  try {
    const app = await NestFactory.create(AppModule, { logger: ["log", "warn", "error"] });

    app.enableCors({ origin: true, credentials: true });
    app.setGlobalPrefix("api", { exclude: ["/"] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    const port = 5000;
    await app.listen(port, "0.0.0.0");
    log.log(`CGP CRM API ready on port ${port}`);
  } catch (err) {
    log.error(`Failed to start API: ${err instanceof Error ? err.message : err}`);
    // Keep process alive for health checks
    const http = require("http");
    const server = http.createServer((_req: any, res: any) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "error", message: "API failed to start" }));
    });
    server.listen(5000, "0.0.0.0");
    log.log("Fallback health server started on port 5000");
  }
}
bootstrap();
