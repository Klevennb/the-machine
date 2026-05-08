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
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
        You are friends.
      </p>
    );
  }

  if (relationship?.status === "PENDING") {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
        {relationship.direction === "outgoing"
          ? "Friend request sent."
          : "This writer sent you a friend request."}
      </p>
    );
  }

  if (relationship?.status === "BLOCKED") {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        Friend requests are unavailable.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <button
        className="w-full rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
        disabled={isSending}
        onClick={sendFriendRequest}
        type="button"
      >
        {isSending ? "Sending..." : "Add Friend"}
      </button>
      {message ? <p className="text-sm text-slate-500">{message}</p> : null}
    </div>
  );
}
