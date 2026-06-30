"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { invariant, invariantString } from "@/lib/invariant";

type LibraryEntry = {
  id: string;
  title: string | null;
  summary: string | null;
  plainText: string | null;
  wordCount: number;
  privateAuthorNote: string | null;
  publicAuthorNote: string | null;
  visibility: "PRIVATE" | "FRIENDS" | "PUBLIC";
  isNsfw: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

type LibraryBrowserProps = {
  initialEntries: LibraryEntry[];
};

type ApiErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
};

type LegacyErrorResponse = {
  error?: string;
};

type VisibilityResponse = {
  ok?: true;
  data?: {
      entry?: {
        id: string;
      visibility: "PRIVATE" | "FRIENDS" | "PUBLIC";
      isNsfw: boolean;
      status: "PUBLISHED";
      updatedAt: string;
      publishedAt: string;
    };
  };
  entry?: {
    id: string;
    visibility: "PRIVATE" | "FRIENDS" | "PUBLIC";
    isNsfw: boolean;
    status: "PUBLISHED";
    updatedAt: string;
    publishedAt: string;
  };
};

function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
  invariant(data !== undefined, "data must be defined.");

  return (
    data !== null &&
    typeof data === "object" &&
    "ok" in data &&
    (data as { ok: unknown }).ok === false
  );
}

function getVisibilityEntry(
  data: VisibilityResponse | ApiErrorResponse | LegacyErrorResponse | null
) {
  invariant(data === null || typeof data === "object", "data must be an object or null.");

  if (!data || isApiErrorResponse(data)) {
    return undefined;
  }

  if ("data" in data) {
    return data.data?.entry;
  }

  return "entry" in data ? data.entry : undefined;
}

function formatDate(value: string | null) {
  invariant(value === null || typeof value === "string", "value must be a string or null.");

  if (!value) {
    return "Not made public";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getEntryTitle(entry: LibraryEntry) {
  invariant(Boolean(entry), "entry is required.");

  return entry.title?.trim() || "Untitled Entry";
}

function getPreview(entry: LibraryEntry) {
  invariant(Boolean(entry), "entry is required.");

  const preview = entry.summary?.trim() || entry.plainText?.trim();

  if (!preview) {
    return "No content yet.";
  }

  return preview.replace(/\s+/g, " ").slice(0, 220);
}

function getDisplayStatus(status: LibraryEntry["status"]) {
  invariant(["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status), "status must be supported.");

  if (status === "DRAFT") {
    return "published";
  }

  if (status === "PUBLISHED") {
    return "made public";
  }

  return "archived";
}

function Spinner({ label }: { label: string }) {
  invariantString(label, "label");

  return (
    <span
      aria-label={label}
      className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      role="status"
    />
  );
}

async function readApiJson<T>(response: Response): Promise<T | null> {
  invariant(response instanceof Response, "response must be a Response.");

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function getApiErrorMessage(data: unknown, fallback: string) {
  invariantString(fallback, "fallback");

  if (!data) {
    return `${fallback} The server did not return a usable response.`;
  }

  if (isApiErrorResponse(data)) {
    return `${data.error.message} Reference: ${data.requestId}`;
  }

  if (
    typeof data === "object" &&
    "error" in data &&
    typeof (data as LegacyErrorResponse).error === "string"
  ) {
    return (data as LegacyErrorResponse).error ?? fallback;
  }

  return fallback;
}

export function LibraryBrowser({ initialEntries }: LibraryBrowserProps) {
  invariant(Array.isArray(initialEntries), "initialEntries must be an array.");

  const [entries, setEntries] = useState(initialEntries);
  const [query, setQuery] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState(
    initialEntries[0]?.id ?? null
  );
  const [visibilityMessage, setVisibilityMessage] = useState("");
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [isExportMode, setIsExportMode] = useState(false);
  const [selectedExportIds, setSelectedExportIds] = useState<string[]>([]);
  const [exportMessage, setExportMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);

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
  const selectedExportCount = selectedExportIds.length;

  const toggleExportSelection = (entryId: string) => {
    invariantString(entryId, "entryId");

    setSelectedExportIds((current) =>
      current.includes(entryId)
        ? current.filter((selectedId) => selectedId !== entryId)
        : [...current, entryId]
    );
    setExportMessage("");
  };

  const exportEntries = async (exportAll: boolean) => {
    invariant(typeof exportAll === "boolean", "exportAll must be boolean.");

    if (!exportAll && selectedExportIds.length === 0) {
      return;
    }

    setIsExporting(true);
    setExportMessage("Preparing export...");

    try {
      const response = await fetch("/api/entries/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          exportAll
            ? { exportAll: true }
            : { entryIds: selectedExportIds, exportAll: false }
        ),
      });

      if (!response.ok) {
        const data = await readApiJson<LegacyErrorResponse>(response);

        setExportMessage(data?.error ?? "Unable to export library.");
        return;
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename =
        filenameMatch?.[1] ?? "writeaway-library-export.zip";
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setExportMessage(
        exportAll
          ? "Library export downloaded."
          : "Selected entries export downloaded."
      );
    } catch {
      setExportMessage("Unable to export library.");
    } finally {
      setIsExporting(false);
    }
  };

  const updateEntrySettings = async ({
    isNsfw,
    visibility,
  }: {
    isNsfw: boolean;
    visibility: "PRIVATE" | "FRIENDS" | "PUBLIC";
  }) => {
    invariant(["PRIVATE", "FRIENDS", "PUBLIC"].includes(visibility), "visibility must be supported.");
    invariant(typeof isNsfw === "boolean", "isNsfw must be boolean.");

    if (
      !selectedEntry ||
      (selectedEntry.visibility === visibility && selectedEntry.isNsfw === isNsfw)
    ) {
      return;
    }

    setUpdatingVisibility(true);
    setVisibilityMessage("Updating story settings...");

    try {
      const response = await fetch(`/api/entries/${selectedEntry.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isNsfw, visibility }),
      });

      const data = await readApiJson<
        VisibilityResponse | ApiErrorResponse | LegacyErrorResponse
      >(response);
      const entry = getVisibilityEntry(data);

      if (!response.ok || !entry) {
        setVisibilityMessage(
          getApiErrorMessage(data, "Unable to update visibility.")
        );
        return;
      }

      setEntries((currentEntries) =>
        currentEntries.map((currentEntry) =>
          currentEntry.id === entry.id
            ? {
                ...currentEntry,
                visibility: entry.visibility,
                isNsfw: entry.isNsfw,
                status: entry.status,
                updatedAt: entry.updatedAt,
                publishedAt: entry.publishedAt,
              }
            : currentEntry
        )
      );
      setVisibilityMessage(
        "Story settings updated."
      );
    } catch {
      setVisibilityMessage("Unable to update visibility.");
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const updateVisibility = async (
    visibility: "PRIVATE" | "FRIENDS" | "PUBLIC"
  ) => {
    await updateEntrySettings({
      isNsfw: selectedEntry?.isNsfw ?? false,
      visibility,
    });
  };

  const updateNsfw = async (isNsfw: boolean) => {
    await updateEntrySettings({
      isNsfw,
      visibility: selectedEntry?.visibility ?? "PRIVATE",
    });
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
        <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 shadow-[var(--shadow-soft)]">
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
        </div>

        <div className="mt-5 max-h-[720px] space-y-4 overflow-auto pr-1">
          {filteredEntries.map((entry) => {
            const isSelected = selectedEntry?.id === entry.id;

            return (
              <article
                className={`w-full rounded-2xl border p-5 text-left transition ${
                  isSelected
                    ? "border-[var(--sage)] bg-white shadow-[var(--shadow-soft)]"
                    : "border-[var(--line)] bg-white/65 hover:border-[var(--line-strong)] hover:bg-white"
                }`}
                key={entry.id}
              >
                <div className="flex items-start gap-3">
                  {isExportMode ? (
                    <label className="flex h-7 shrink-0 cursor-pointer items-center gap-2">
                      <input
                        checked={selectedExportIds.includes(entry.id)}
                        className="size-4 accent-[var(--sage)]"
                        onChange={() => toggleExportSelection(entry.id)}
                        type="checkbox"
                      />
                      <span className="sr-only">
                        Select {getEntryTitle(entry)} for export
                      </span>
                    </label>
                  ) : null}
                  <button
                    className="min-w-0 flex-1 cursor-pointer text-left"
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
                      {entry.isNsfw ? (
                        <span className="shrink-0 rounded-full bg-[var(--sunset-soft)] px-2.5 py-1 text-xs font-bold text-[var(--sunset)]">
                          NSFW
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                      {getPreview(entry)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-[var(--muted)]">
                      <span>{entry.wordCount} words</span>
                      <span>Updated {formatDate(entry.updatedAt)}</span>
                      <span>{getDisplayStatus(entry.status)}</span>
                    </div>
                  </button>
                </div>
              </article>
            );
          })}

          {filteredEntries.length === 0 ? (
            <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4 text-sm text-[var(--muted)]">
              No entries match your search.
            </div>
          ) : null}
        </div>

        <section className="mt-5 rounded-2xl border border-[var(--line)] bg-white/70 p-4 shadow-[var(--shadow-soft)]">
          <button
            className="app-button-secondary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isExporting}
            onClick={() => {
              setIsExportMode((current) => !current);
              setExportMessage("");
            }}
            type="button"
          >
            Export Writing
          </button>

          {isExportMode ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                className="app-button-secondary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isExporting}
                onClick={() => exportEntries(true)}
                type="button"
              >
                Export All Writing
              </button>
              <button
                className="app-button-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
                disabled={isExporting || selectedExportCount === 0}
                onClick={() => exportEntries(false)}
                type="button"
              >
                Export Selected Writing
              </button>
              <span className="text-sm font-semibold text-[var(--muted)]">
                {selectedExportCount} selected
              </span>
            </div>
          ) : null}

          {exportMessage ? (
            <p className="mt-3 text-sm font-semibold text-[var(--muted)]">
              {exportMessage}
            </p>
          ) : null}
        </section>
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
                  <span>Made public {formatDate(selectedEntry.publishedAt)}</span>
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
                } cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={updatingVisibility}
                onClick={() => updateVisibility("PRIVATE")}
                type="button"
              >
                Private
              </button>
              <button
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  selectedEntry.visibility === "FRIENDS"
                    ? "bg-[var(--sage)] text-white"
                    : "border border-[var(--line-strong)] bg-white text-[var(--sage-dark)] hover:bg-[var(--paper-soft)]"
                } cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={updatingVisibility}
                onClick={() => updateVisibility("FRIENDS")}
                type="button"
              >
                Friends
              </button>
              <button
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  selectedEntry.visibility === "PUBLIC"
                    ? "bg-[var(--sage)] text-white"
                    : "border border-[var(--line-strong)] bg-white text-[var(--sage-dark)] hover:bg-[var(--paper-soft)]"
                } cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
                disabled={updatingVisibility}
                onClick={() => updateVisibility("PUBLIC")}
                type="button"
              >
                Public
              </button>
              <label className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--sage-dark)]">
                <input
                  checked={selectedEntry.isNsfw}
                  className="size-4 accent-[var(--sage)]"
                  disabled={updatingVisibility}
                  onChange={(event) => updateNsfw(event.target.checked)}
                  type="checkbox"
                />
                NSFW
              </label>
              {visibilityMessage ? (
                <span
                  aria-live="polite"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)]"
                >
                  {updatingVisibility ? (
                    <Spinner
                      label={
                        "Updating story settings"
                      }
                    />
                  ) : null}
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
