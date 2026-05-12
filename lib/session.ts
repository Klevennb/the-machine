import type { Session } from "next-auth";

type SessionWithUserId = Session & {
  user?: Session["user"] & {
    id?: string;
  };
};

export function getSessionUserId(session: Session | null) {
  return (session as SessionWithUserId | null)?.user?.id ?? null;
}
