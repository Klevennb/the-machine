import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ClerkUser = Awaited<ReturnType<typeof currentUser>>;
type ClerkEmailAddress = NonNullable<ClerkUser>["emailAddresses"][number];

function cleanEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || null;
}

function getDisplayName(user: ClerkUser) {
  if (!user) {
    return null;
  }

  return (
    user.fullName?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username?.trim() ||
    null
  );
}

function isVerifiedEmailAddress(emailAddress: ClerkEmailAddress) {
  return emailAddress.verification?.status === "verified";
}

function getPrimaryEmail(user: ClerkUser) {
  return cleanEmail(
    user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses[0]?.emailAddress ??
      null
  );
}

function getVerifiedEmailAddresses(user: ClerkUser) {
  if (!user) {
    return [];
  }

  return Array.from(
    new Set(
      user.emailAddresses
        .filter(isVerifiedEmailAddress)
        .map((emailAddress) => cleanEmail(emailAddress.emailAddress))
        .filter((email): email is string => Boolean(email))
    )
  );
}

async function findLocalUserIdByProviderId(clerkId: string) {
  const localUser = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  return localUser?.id ?? null;
}

async function linkVerifiedLegacyUser({
  clerkId,
  image,
  name,
  verifiedEmails,
}: {
  clerkId: string;
  image: string | null;
  name: string | null;
  verifiedEmails: string[];
}) {
  if (verifiedEmails.length === 0) {
    return null;
  }

  const emailUser = await prisma.user.findFirst({
    where: {
      email: { in: verifiedEmails },
    },
    select: {
      id: true,
      clerkId: true,
    },
  });

  if (!emailUser) {
    return null;
  }

  if (emailUser.clerkId && emailUser.clerkId !== clerkId) {
    return null;
  }

  const linkedUser = await prisma.user.update({
    where: { id: emailUser.id },
    data: {
      clerkId,
      image,
      name: name ?? undefined,
    },
    select: { id: true },
  });

  return linkedUser.id;
}

export async function getClerkProviderUserId() {
  const { userId } = await auth();
  return userId ?? null;
}

export async function getClerkAppUserId() {
  const clerkId = await getClerkProviderUserId();

  if (!clerkId) {
    return null;
  }

  const existingUserId = await findLocalUserIdByProviderId(clerkId);

  if (existingUserId) {
    return existingUserId;
  }

  const clerkUser = await currentUser();
  const verifiedEmails = getVerifiedEmailAddresses(clerkUser);
  const email = getPrimaryEmail(clerkUser);
  const name = getDisplayName(clerkUser);
  const image = clerkUser?.imageUrl ?? null;

  const linkedLegacyUserId = await linkVerifiedLegacyUser({
    clerkId,
    image,
    name,
    verifiedEmails,
  });

  if (linkedLegacyUserId) {
    return linkedLegacyUserId;
  }

  try {
    const localUser = await prisma.user.create({
      data: {
        clerkId,
        email,
        image,
        name,
        password: null,
      },
      select: { id: true },
    });

    return localUser.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return findLocalUserIdByProviderId(clerkId);
    }

    throw error;
  }
}
