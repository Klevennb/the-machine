import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { IS_UNDER_MAINTENANCE, MAINTENANCE_PATH } from "@/lib/maintenance";

const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/maintenance(.*)",
  "/register(.*)",
  "/__clerk(.*)",
]);

export const authProxy = clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  if (IS_UNDER_MAINTENANCE && pathname !== MAINTENANCE_PATH) {
    if (pathname.startsWith("/api/") || pathname.startsWith("/trpc/")) {
      return Response.json(
        { error: "Service unavailable during maintenance." },
        { status: 503 }
      );
    }

    return NextResponse.redirect(new URL(MAINTENANCE_PATH, request.url));
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});
