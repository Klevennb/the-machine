"use client";

import Link from "next/link";
import { useState } from "react";

type SearchUser = {
  id: string;
  displayName: string;
  username: string | null;
  bio: string | null;
  profileVisibility: "PRIVATE" | "MEMBERS" | "PUBLIC";
  relationship: {
    id: string;
    status: "PENDING" | "ACCEPTED" | "BLOCKED";
    direction: "incoming" | "outgoing";
  } | null;
};

type FriendRequest = {
  id: string;
  message: string | null;
  createdAt: string;
  requester: {
    id: string;
    displayName: string;
    username: string | null;
    bio: string | null;
  };
};

type UserSearchProps = {
  initialRequests: FriendRequest[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function usernameLabel(username: string | null) {
  return username ? `@${username}` : "No username";
}

export function UserSearch({ initialRequests }: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [requests, setRequests] = useState(initialRequests);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [searchMessage, setSearchMessage] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const searchUsers = async () => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setUsers([]);
      setSearchMessage("Enter at least 2 characters.");
      return;
    }

    setLoadingSearch(true);
    setSearchMessage("Searching writers...");

    try {
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(trimmedQuery)}`
      );
      const data = (await response.json()) as {
        error?: string;
        users?: SearchUser[];
      };

      if (!response.ok || !data.users) {
        setSearchMessage(data.error ?? "Unable to search writers.");
        return;
      }

      setUsers(data.users);
      setSearchMessage(
        data.users.length === 0 ? "No writers matched that search." : ""
      );
    } catch {
      setSearchMessage("Unable to search writers.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    setBusyId(userId);
    setRequestMessage("Sending friend request...");

    try {
      const response = await fetch("/api/friends/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addresseeId: userId,
          message: messages[userId] ?? "",
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        request?: { id: string; status: "PENDING" };
      };

      if (!response.ok || !data.request) {
        setRequestMessage(data.error ?? "Unable to send friend request.");
        return;
      }

      const sentRequest = data.request;

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId
            ? {
                ...user,
                relationship: {
                  id: sentRequest.id,
                  status: sentRequest.status,
                  direction: "outgoing",
                },
              }
            : user
        )
      );
      setMessages((current) => ({ ...current, [userId]: "" }));
      setRequestMessage("Friend request sent.");
    } catch {
      setRequestMessage("Unable to send friend request.");
    } finally {
      setBusyId(null);
    }
  };

  const updateFriendRequest = async (
    requestId: string,
    action: "accept" | "deny" | "ignore"
  ) => {
    setBusyId(requestId);
    setRequestMessage(
      action === "accept"
        ? "Accepting request..."
        : action === "deny"
          ? "Denying request..."
          : "Ignoring request..."
    );

    try {
      const response = await fetch(`/api/friends/requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const data = (await response.json()) as {
        error?: string;
        request?: { id: string; status: string };
      };

      if (!response.ok || !data.request) {
        setRequestMessage(data.error ?? "Unable to update friend request.");
        return;
      }

      setRequests((currentRequests) =>
        currentRequests.filter((friendRequest) => friendRequest.id !== requestId)
      );
      setRequestMessage(
        action === "accept"
          ? "Friend request accepted."
          : action === "deny"
            ? "Friend request denied."
            : "Friend request ignored."
      );
    } catch {
      setRequestMessage("Unable to update friend request.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-xl font-semibold text-slate-950">Find Writers</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchMessage("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void searchUsers();
              }
            }}
            placeholder="Search by name or username"
            type="search"
            value={query}
          />
          <button
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={loadingSearch}
            onClick={searchUsers}
            type="button"
          >
            {loadingSearch ? "Searching..." : "Search"}
          </button>
        </div>
        {searchMessage ? (
          <p className="mt-3 text-sm text-slate-500">{searchMessage}</p>
        ) : null}

        <div className="mt-5 space-y-4">
          {users.map((user) => (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5"
              key={user.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-semibold text-slate-950">
                    {user.displayName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {usernameLabel(user.username)}
                  </p>
                </div>
                {user.relationship?.status === "ACCEPTED" ? (
                  <Link
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    href={`/users/${user.id}`}
                  >
                    View Profile
                  </Link>
                ) : null}
              </div>
              {user.bio ? (
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                  {user.bio}
                </p>
              ) : null}

              {user.relationship ? (
                <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {user.relationship.status === "ACCEPTED"
                    ? "You are friends."
                    : user.relationship.direction === "outgoing"
                      ? "Friend request sent."
                      : "This writer sent you a request."}
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  <textarea
                    className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    maxLength={500}
                    onChange={(event) =>
                      setMessages((current) => ({
                        ...current,
                        [user.id]: event.target.value,
                      }))
                    }
                    placeholder="Add a short message..."
                    value={messages[user.id] ?? ""}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      {(messages[user.id] ?? "").length}/500
                    </span>
                    <button
                      className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      disabled={busyId === user.id}
                      onClick={() => sendFriendRequest(user.id)}
                      type="button"
                    >
                      {busyId === user.id ? "Sending..." : "Send Request"}
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-slate-950">
          Friend Requests
        </h2>
        {requestMessage ? (
          <p className="mt-3 text-sm text-slate-500">{requestMessage}</p>
        ) : null}

        <div className="mt-4 space-y-4">
          {requests.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No pending friend requests.
            </div>
          ) : null}

          {requests.map((friendRequest) => (
            <article
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              key={friendRequest.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold text-slate-950">
                    {friendRequest.requester.displayName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {usernameLabel(friendRequest.requester.username)}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {formatDate(friendRequest.createdAt)}
                </span>
              </div>
              {friendRequest.message ? (
                <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
                  {friendRequest.message}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={busyId === friendRequest.id}
                  onClick={() => updateFriendRequest(friendRequest.id, "accept")}
                  type="button"
                >
                  Accept
                </button>
                <button
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={busyId === friendRequest.id}
                  onClick={() => updateFriendRequest(friendRequest.id, "deny")}
                  type="button"
                >
                  Deny
                </button>
                <button
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={busyId === friendRequest.id}
                  onClick={() => updateFriendRequest(friendRequest.id, "ignore")}
                  type="button"
                >
                  Ignore
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
