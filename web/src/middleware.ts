import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth is handled client-side by ClerkProvider.
// Middleware is pass-through to avoid 500 when Clerk keys are missing.
// When Clerk keys are configured, add:
//   import { clerkMiddleware } from "@clerk/nextjs/server"
// and replace the default export.

export default async function middleware(_req: NextRequest): Promise<NextResponse> {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
