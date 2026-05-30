import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAuthProviderUserId, getCurrentUserId } from "@/lib/auth";

function splitEnvList(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function isCurrentUserAdmin() {
  const [clerkId, localUserId, clerkUser] = await Promise.all([
    getCurrentAuthProviderUserId(),
    getCurrentUserId(),
    currentUser(),
  ]);
  const adminClerkIds = splitEnvList(process.env.CLERK_ADMIN_USER_IDS);
  const adminEmails = splitEnvList(process.env.ADMIN_EMAILS);

  if (clerkId && adminClerkIds.has(clerkId.toLowerCase())) {
    return true;
  }

  const clerkEmails =
    clerkUser?.emailAddresses.map((email) =>
      email.emailAddress.trim().toLowerCase()
    ) ?? [];

  if (clerkEmails.some((email) => adminEmails.has(email))) {
    return true;
  }

  if (!localUserId) {
    return false;
  }

  const localUser = await prisma.user.findUnique({
    where: { id: localUserId },
    select: { email: true },
  });

  return Boolean(
    localUser?.email && adminEmails.has(localUser.email.trim().toLowerCase())
  );
}

export async function requireAdmin() {
  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    throw new Error("Unauthorized");
  }
}
