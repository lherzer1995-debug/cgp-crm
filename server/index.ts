import "dotenv/config";
import express, { Response, NextFunction } from 'express';
import type { Request } from 'express';
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "node:http";
import { syncAllActivitiesToCalendar } from "./gcalDirect";
import { loadTokenFromDisk } from "./oauth";

// Load persisted OAuth token before anything else so gcalConfigured() is
// accurate when routes are registered and the sync interval is set up.
loadTokenFromDisk();

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Never log full response bodies — they may contain IBAN, PII, financial data
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);

      // ── Periodic Google Calendar background sync ──────────────────────────
      // Runs every 4 minutes and syncs any activity that has a dueDate but
      // no calendarEventId yet.  Fires once immediately on startup so that
      // activities created while the server was offline are caught quickly.
      // The interval always runs; syncAllActivitiesToCalendar() is a no-op
      // when no token is available, so connecting via OAuth mid-session will
      // automatically start syncing on the next tick.
      const SYNC_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

      const runSync = () => {
        syncAllActivitiesToCalendar().catch((err) => {
          console.error("[GCal] Unexpected error in background sync:", err);
        });
      };

      // Initial run shortly after boot so we don't wait a full interval
      setTimeout(runSync, 10_000);
      setInterval(runSync, SYNC_INTERVAL_MS);

      log(`Google Calendar background sync scheduled every ${SYNC_INTERVAL_MS / 1000}s`, "gcal");
    },
  );
})();
