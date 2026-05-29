import { getClerkAppUserId, getClerkProviderUserId } from "@/lib/auth/clerk";

export async function getCurrentAuthProviderUserId() {
  return getClerkProviderUserId();
}

export async function getCurrentUserId() {
  return getClerkAppUserId();
}

export async function requireCurrentUserId() {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}
