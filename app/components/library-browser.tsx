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
      <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-6 shadow-[var(--shadow-soft)]">
        <p className="text-sm text-[var(--muted)]">
          Your library is empty. Start a new entry to see it here.
        </p>
        <Link
          className="app-button-primary mt-4 inline-flex px-5 py-2.5 text-sm"
          href="/write"
        >
          Start Writing
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.25fr)]">
      <section className="min-w-0">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-[var(--charcoal)]">
            Search entries
          </span>
          <input
            className="app-field w-full px-4 py-3"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, body, notes, status..."
            type="search"
            value={query}
          />
        </label>

        <div className="mt-5 max-h-[720px] space-y-4 overflow-auto pr-1">
          {filteredEntries.map((entry) => {
            const isSelected = selectedEntry?.id === entry.id;

            return (
              <button
                className={`w-full rounded-2xl border p-5 text-left transition ${
                  isSelected
                    ? "border-[var(--sage)] bg-white shadow-[var(--shadow-soft)]"
                    : "border-[var(--line)] bg-white/65 hover:border-[var(--line-strong)] hover:bg-white"
                }`}
                key={entry.id}
                onClick={() => {
                  setSelectedEntryId(entry.id);
                  setVisibilityMessage("");
                }}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 truncate font-literary text-xl font-semibold text-[var(--charcoal)]">
                    {getEntryTitle(entry)}
                  </h2>
                  <span className="shrink-0 rounded-full bg-[var(--paper-muted)] px-2.5 py-1 text-xs font-bold text-[var(--sage-dark)]">
                    {entry.visibility.toLowerCase()}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                  {getPreview(entry)}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-[var(--muted)]">
                  <span>{entry.wordCount} words</span>
                  <span>Updated {formatDate(entry.updatedAt)}</span>
                  <span>{entry.status.toLowerCase()}</span>
                </div>
              </button>
            );
          })}

          {filteredEntries.length === 0 ? (
            <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 text-sm text-[var(--muted)]">
              No entries match your search.
            </div>
          ) : null}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-[var(--line)] bg-white/75 p-6 shadow-[var(--shadow-soft)]">
        {selectedEntry ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="break-words font-literary text-3xl font-semibold tracking-tight text-[var(--charcoal)]">
                  {getEntryTitle(selectedEntry)}
                </h2>
                <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold text-[var(--muted)]">
                  <span>{selectedEntry.wordCount} words</span>
                  <span>Updated {formatDate(selectedEntry.updatedAt)}</span>
                  <span>Published {formatDate(selectedEntry.publishedAt)}</span>
                </div>
              </div>
              <Link
                className="app-button-primary shrink-0 px-5 py-2.5 text-sm"
                href={`/write?entryId=${selectedEntry.id}`}
              >
                Edit Entry
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--paper-soft)] p-4">
              <span className="text-sm font-bold text-[var(--charcoal)]">
                Visibility
              </span>
              <button
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  selectedEntry.visibility === "PRIVATE"
                    ? "bg-[var(--sage)] text-white"
                    : "border border-[var(--line-strong)] bg-white text-[var(--sage-dark)] hover:bg-[var(--paper-soft)]"
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
                    ? "bg-[var(--sage)] text-white"
                    : "border border-[var(--line-strong)] bg-white text-[var(--sage-dark)] hover:bg-[var(--paper-soft)]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={updatingVisibility}
                onClick={() => updateVisibility("PUBLIC")}
                type="button"
              >
                Public
              </button>
              {visibilityMessage ? (
                <span className="text-sm font-semibold text-[var(--muted)]">
                  {visibilityMessage}
                </span>
              ) : null}
            </div>

            <article className="mt-5 max-h-[560px] overflow-auto whitespace-pre-wrap rounded-2xl bg-[var(--paper-soft)] p-6 font-literary text-lg leading-9 text-[var(--charcoal)]">
              {selectedEntry.plainText?.trim() || "No content yet."}
            </article>

            {selectedEntry.privateAuthorNote ||
            selectedEntry.publicAuthorNote ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {selectedEntry.privateAuthorNote ? (
                  <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                    <h3 className="text-sm font-bold text-[var(--charcoal)]">
                      Private note
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                      {selectedEntry.privateAuthorNote}
                    </p>
                  </div>
                ) : null}
                {selectedEntry.publicAuthorNote ? (
                  <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                    <h3 className="text-sm font-bold text-[var(--charcoal)]">
                      Public note
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                      {selectedEntry.publicAuthorNote}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <div className="text-sm text-[var(--muted)]">Select an entry to read it.</div>
        )}
      </section>
    </div>
  );
}
