import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = NextAuth(authOptions);

export async function GET(
  request: Request,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  return handler(request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  return handler(request, context);
}
