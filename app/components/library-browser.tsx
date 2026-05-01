"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type LibraryEntry = {
  id: string;
  title: string | null;
  summary: string | null;
  plainText: string | null;
  wordCount: number;
  privateAuthorNote: string | null;
  publicAuthorNote: string | null;
  visibility: "PRIVATE" | "FRIENDS" | "PUBLIC";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

type LibraryBrowserProps = {
  initialEntries: LibraryEntry[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not published";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getEntryTitle(entry: LibraryEntry) {
  return entry.title?.trim() || "Untitled Entry";
}

function getPreview(entry: LibraryEntry) {
  const preview = entry.summary?.trim() || entry.plainText?.trim();

  if (!preview) {
    return "No content yet.";
  }

  return preview.replace(/\s+/g, " ").slice(0, 220);
}

export function LibraryBrowser({ initialEntries }: LibraryBrowserProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [query, setQuery] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState(
    initialEntries[0]?.id ?? null
  );
  const [visibilityMessage, setVisibilityMessage] = useState("");
  const [updatingVisibility, setUpdatingVisibility] = useState(false);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return entries;
    }

    return entries.filter((entry) => {
      const searchable = [
        entry.title,
        entry.summary,
        entry.plainText,
        entry.privateAuthorNote,
        entry.publicAuthorNote,
        entry.status,
        entry.visibility,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [entries, query]);

  const selectedEntry =
    entries.find((entry) => entry.id === selectedEntryId) ??
    filteredEntries[0] ??
    null;

  const updateVisibility = async (visibility: "PRIVATE" | "PUBLIC") => {
    if (!selectedEntry || selectedEntry.visibility === visibility) {
      return;
    }

    setUpdatingVisibility(true);
    setVisibilityMessage("Updating visibility...");

    try {
      const response = await fetch(`/api/entries/${selectedEntry.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ visibility }),
      });

      const data = (await response.json()) as {
        error?: string;
        entry?: {
          id: string;
          visibility: "PRIVATE" | "PUBLIC";
          status: "PUBLISHED";
          updatedAt: string;
          publishedAt: string;
        };
      };

      if (!response.ok || !data.entry) {
        setVisibilityMessage(data.error ?? "Unable to update visibility.");
        return;
      }

      setEntries((currentEntries) =>
        currentEntries.map((entry) =>
          entry.id === data.entry?.id
            ? {
                ...entry,
                visibility: data.entry.visibility,
                status: data.entry.status,
                updatedAt: data.entry.updatedAt,
                publishedAt: data.entry.publishedAt,
              }
            : entry
        )
      );
      setVisibilityMessage(
        visibility === "PUBLIC" ? "Entry is public." : "Entry is private."
      );
    } catch {
      setVisibilityMessage("Unable to update visibility.");
    } finally {
      setUpdatingVisibility(false);
    }
  };

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <p className="text-sm text-slate-600">
          Your library is empty. Start a new entry to see it here.
        </p>
        <Link
          className="mt-4 inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          href="/write"
        >
          Start Writing
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.4fr)]">
      <section className="min-w-0">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Search entries
          </span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, body, notes, status..."
            type="search"
            value={query}
          />
        </label>

        <div className="mt-4 max-h-[620px] space-y-3 overflow-auto pr-1">
          {filteredEntries.map((entry) => {
            const isSelected = selectedEntry?.id === entry.id;

            return (
              <button
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  isSelected
                    ? "border-slate-900 bg-white shadow-sm"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                }`}
                key={entry.id}
                onClick={() => {
                  setSelectedEntryId(entry.id);
                  setVisibilityMessage("");
                }}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 truncate text-base font-semibold text-slate-950">
                    {getEntryTitle(entry)}
                  </h2>
                  <span className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {entry.visibility.toLowerCase()}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                  {getPreview(entry)}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>{entry.wordCount} words</span>
                  <span>Updated {formatDate(entry.updatedAt)}</span>
                  <span>{entry.status.toLowerCase()}</span>
                </div>
              </button>
            );
          })}

          {filteredEntries.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No entries match your search.
            </div>
          ) : null}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
        {selectedEntry ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="break-words text-2xl font-semibold tracking-tight text-slate-950">
                  {getEntryTitle(selectedEntry)}
                </h2>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                  <span>{selectedEntry.wordCount} words</span>
                  <span>Updated {formatDate(selectedEntry.updatedAt)}</span>
                  <span>Published {formatDate(selectedEntry.publishedAt)}</span>
                </div>
              </div>
              <Link
                className="shrink-0 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                href={`/write?entryId=${selectedEntry.id}`}
              >
                Edit Entry
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-sm font-medium text-slate-700">
                Visibility
              </span>
              <button
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  selectedEntry.visibility === "PRIVATE"
                    ? "bg-slate-950 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={updatingVisibility}
                onClick={() => updateVisibility("PRIVATE")}
                type="button"
              >
                Private
              </button>
              <button
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  selectedEntry.visibility === "PUBLIC"
                    ? "bg-slate-950 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={updatingVisibility}
                onClick={() => updateVisibility("PUBLIC")}
                type="button"
              >
                Public
              </button>
              {visibilityMessage ? (
                <span className="text-sm text-slate-500">
                  {visibilityMessage}
                </span>
              ) : null}
            </div>

            <article className="mt-5 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-5 text-base leading-8 text-slate-800">
              {selectedEntry.plainText?.trim() || "No content yet."}
            </article>

            {selectedEntry.privateAuthorNote ||
            selectedEntry.publicAuthorNote ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {selectedEntry.privateAuthorNote ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Private note
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {selectedEntry.privateAuthorNote}
                    </p>
                  </div>
                ) : null}
                {selectedEntry.publicAuthorNote ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Public note
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {selectedEntry.publicAuthorNote}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <div className="text-sm text-slate-600">Select an entry to read it.</div>
        )}
      </section>
    </div>
  );
}
