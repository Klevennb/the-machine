"use client";

import { useState } from "react";

type Relationship = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "BLOCKED";
  direction: "incoming" | "outgoing";
} | null;

type ProfileFriendButtonProps = {
  profileUserId: string;
  initialRelationship: Relationship;
};

export function ProfileFriendButton({
  profileUserId,
  initialRelationship,
}: ProfileFriendButtonProps) {
  const [relationship, setRelationship] = useState(initialRelationship);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendFriendRequest = async () => {
    setIsSending(true);
    setMessage("Sending friend request...");

    try {
      const response = await fetch("/api/friends/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addresseeId: profileUserId,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        request?: { id: string; status: "PENDING" };
      };

      if (!response.ok || !data.request) {
        setMessage(data.error ?? "Unable to send friend request.");
        return;
      }

      setRelationship({
        id: data.request.id,
        status: data.request.status,
        direction: "outgoing",
      });
      setMessage("Friend request sent.");
    } catch {
      setMessage("Unable to send friend request.");
    } finally {
      setIsSending(false);
    }
  };

  if (relationship?.status === "ACCEPTED") {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
        You are friends.
      </p>
    );
  }

  if (relationship?.status === "PENDING") {
    return (
      <p className="rounded-2xl border border-[var(--sunset-soft)] bg-[var(--sunset-soft)] px-4 py-3 text-sm font-bold text-[var(--sunset)]">
        {relationship.direction === "outgoing"
          ? "Friend request sent."
          : "This writer sent you a friend request."}
      </p>
    );
  }

  if (relationship?.status === "BLOCKED") {
    return (
      <p className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)]">
        Friend requests are unavailable.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <button
        className="app-button-primary w-full px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-[var(--muted)] sm:w-auto"
        disabled={isSending}
        onClick={sendFriendRequest}
        type="button"
      >
        {isSending ? "Sending..." : "Add Friend"}
      </button>
      {message ? <p className="text-sm font-semibold text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
