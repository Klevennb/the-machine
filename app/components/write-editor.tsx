"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Prisma } from "@prisma/client";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  type EditorState,
  type LexicalEditor,
} from "lexical";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  HeadingNode,
  QuoteNode,
} from "@lexical/rich-text";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  $isListNode,
  ListItemNode,
  ListNode,
} from "@lexical/list";
import { LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
  $setBlocksType,
} from "@lexical/selection";
import { invariant, invariantString } from "@/lib/invariant";

type ToolbarState = {
  canUndo: boolean;
  canRedo: boolean;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrikethrough: boolean;
  blockType: "paragraph" | "h1" | "h2" | "quote" | "bullet" | "number";
  fontSize: string;
  isLink: boolean;
};

const theme = {
  paragraph: "mb-3",
  quote:
    "my-4 border-l-4 border-amber-300 bg-amber-50/70 px-4 py-3 text-slate-700",
  heading: {
    h1: "mb-3 text-3xl font-semibold tracking-tight text-slate-950",
    h2: "mb-3 text-2xl font-semibold tracking-tight text-slate-950",
  },
  list: {
    ul: "my-3 list-disc pl-6",
    ol: "my-3 list-decimal pl-6",
    listitem: "my-1",
  },
  link: "text-sky-700 underline underline-offset-2",
  text: {
    bold: "font-semibold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
  },
};

const editorConfig = {
  namespace: "WriteNowEditor",
  theme,
  onError(error: Error) {
    throw error;
  },
  nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
};

const DEFAULT_TOOLBAR_STATE: ToolbarState = {
  canUndo: false,
  canRedo: false,
  isBold: false,
  isItalic: false,
  isUnderline: false,
  isStrikethrough: false,
  blockType: "paragraph",
  fontSize: "16px",
  isLink: false,
};

const FONT_SIZES = ["12px", "14px", "16px", "18px", "24px", "32px"];
const GENRES = [
  "Fantasy",
  "Science Fiction",
  "Romance",
  "Mystery",
  "Horror",
  "Literary",
  "Poetry",
  "Memoir",
  "Thriller",
  "Historical",
  "Comedy",
  "Nonfiction",
];

type DraftContent = {
  root: {
    children: Prisma.JsonValue[];
    direction: null | "ltr" | "rtl";
    format: string;
    indent: number;
    type: "root";
    version: number;
  };
};

type JsonRecord = Record<string, Prisma.JsonValue>;

type DraftEntry = {
  id: string;
  title: string;
  plainText: string;
  content: Prisma.JsonValue | null;
  wordCount: number;
  privateAuthorNote: string;
  publicAuthorNote: string;
  visibility: "PRIVATE" | "FRIENDS" | "PUBLIC";
  isNsfw: boolean;
  prompt: WritingPrompt | null;
};

type WriteEditorProps = {
  initialDraft: DraftEntry | null;
  initialProgress: WritingProgress;
  showPromptPicker: boolean;
  dailyContest: { id: string; promptTitle: string; promptBody: string; promptGenre: string } | null;
};

type WritingPrompt = {
  id: string;
  title: string;
  body: string;
  genre: string;
  tags: string[];
};

type WritingProgress = {
  date: string;
  wordsWritten: number;
  targetWords: number;
  goalMet: boolean;
  creditedDelta: number;
  currentStreakDays: number;
  bestStreakDays: number;
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

type PublishEntryResponse = {
  ok?: true;
  data?: {
    draft?: { id: string; updatedAt: string };
    progress?: WritingProgress;
  };
  draft?: { id: string; updatedAt: string };
  progress?: WritingProgress;
  requestId?: string;
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

function getPublishDraft(data: PublishEntryResponse | ApiErrorResponse | LegacyErrorResponse | null) {
  invariant(data === null || typeof data === "object", "data must be an object or null.");

  if (!data || isApiErrorResponse(data)) {
    return undefined;
  }

  if ("data" in data) {
    return data.data?.draft;
  }

  return "draft" in data ? data.draft : undefined;
}

function getPublishProgress(data: PublishEntryResponse | ApiErrorResponse | LegacyErrorResponse | null) {
  invariant(data === null || typeof data === "object", "data must be an object or null.");

  if (!data || isApiErrorResponse(data)) {
    return undefined;
  }

  if ("data" in data) {
    return data.data?.progress;
  }

  return "progress" in data ? data.progress : undefined;
}

function Placeholder() {
  invariant(typeof theme === "object", "editor theme must be configured.");

  return (
    <div className="pointer-events-none absolute inset-0 px-6 py-6 font-literary text-lg leading-9 text-[var(--paper-deep)] md:px-10 md:py-10">
      Start drafting here...
    </div>
  );
}

function createEmptyEditorState(): DraftContent {
  invariant(Array.isArray(FONT_SIZES), "font sizes must be configured.");

  return {
    root: {
      children: [
        {
          children: [],
          direction: null,
          format: "",
          indent: 0,
          textFormat: 0,
          textStyle: "",
          type: "paragraph",
          version: 1,
        },
      ],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
}

function normalizeInitialContent(
  content: Prisma.JsonValue | null | undefined
): DraftContent {
  invariant(content !== undefined || content === undefined, "content may be undefined.");

  if (
    !content ||
    typeof content !== "object" ||
    Array.isArray(content) ||
    !("root" in content)
  ) {
    return createEmptyEditorState();
  }

  const root = (content as JsonRecord).root;

  if (
    !root ||
    typeof root !== "object" ||
    Array.isArray(root) ||
    !Array.isArray(root.children) ||
    root.children.length === 0
  ) {
    return createEmptyEditorState();
  }

  return content as DraftContent;
}

function ToolbarButton({
  active = false,
  disabled = false,
  label,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  invariantString(label, "label");
  invariant(typeof onClick === "function", "onClick must be a function.");

  return (
    <button
      className={`rounded-full border px-3 py-2 text-sm font-bold transition ${
        active
          ? "border-[var(--sage)] bg-[var(--sage)] text-white"
          : "border-[var(--line)] bg-white/70 text-[var(--sage-dark)] hover:border-[var(--line-strong)] hover:bg-white"
      } disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-[var(--paper-muted)] disabled:text-[var(--muted)]`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
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

function getToolbarState(editor: LexicalEditor): ToolbarState {
  invariant(Boolean(editor), "editor is required.");

  return editor.getEditorState().read(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      return DEFAULT_TOOLBAR_STATE;
    }

    const anchorNode = selection.anchor.getNode();
    const topLevelElement = anchorNode.getTopLevelElementOrThrow();
    const blockType = topLevelElement.getType();
    const parent = anchorNode.getParent();
    const isLinked =
      topLevelElement.getType() === "link" ||
      parent?.getType() === "link" ||
      anchorNode.getType() === "link";

    let resolvedBlockType: ToolbarState["blockType"] = "paragraph";

    if ($isHeadingNode(topLevelElement)) {
      const tag = topLevelElement.getTag();
      resolvedBlockType = tag === "h2" ? "h2" : "h1";
    } else if (blockType === "quote") {
      resolvedBlockType = "quote";
    } else if ($isListNode(topLevelElement)) {
      resolvedBlockType = topLevelElement.getListType() === "number" ? "number" : "bullet";
    }

    return {
      canUndo: false,
      canRedo: false,
      isBold: selection.hasFormat("bold"),
      isItalic: selection.hasFormat("italic"),
      isUnderline: selection.hasFormat("underline"),
      isStrikethrough: selection.hasFormat("strikethrough"),
      blockType: resolvedBlockType,
      fontSize: $getSelectionStyleValueForProperty(selection, "font-size", "16px"),
      isLink: Boolean(isLinked),
    };
  });
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  invariant(Boolean(editor), "editor is required.");

  const [toolbarState, setToolbarState] = useState<ToolbarState>(() =>
    getToolbarState(editor)
  );

  const refreshToolbar = useCallback(() => {
    invariant(Boolean(editor), "editor is required.");

    const nextState = getToolbarState(editor);

    setToolbarState((current) => ({
      ...nextState,
      canUndo: current.canUndo,
      canRedo: current.canRedo,
    }));
  }, [editor]);

  useEffect(() => {
    const unregisterUpdate = editor.registerUpdateListener(() => {
      refreshToolbar();
    });

    const unregisterSelection = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        refreshToolbar();
        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    const unregisterCanUndo = editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setToolbarState((current) => ({ ...current, canUndo: payload }));
        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    const unregisterCanRedo = editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setToolbarState((current) => ({ ...current, canRedo: payload }));
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
    return () => {
      unregisterUpdate();
      unregisterSelection();
      unregisterCanUndo();
      unregisterCanRedo();
    };
  }, [editor, refreshToolbar]);

  const applyBlockType = (value: ToolbarState["blockType"]) => {
    invariant(
      ["paragraph", "h1", "h2", "quote", "bullet", "number"].includes(value),
      "block type must be supported."
    );

    editor.update(() => {
      const selection = $getSelection();

      if (!$isRangeSelection(selection)) {
        return;
      }

      if (value === "paragraph") {
        $setBlocksType(selection, () => $createParagraphNode());
        return;
      }

      if (value === "h1" || value === "h2") {
        $setBlocksType(selection, () => $createHeadingNode(value));
        return;
      }

      if (value === "quote") {
        $setBlocksType(selection, () => $createQuoteNode());
        return;
      }
    });

    if (value === "bullet") {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    }

    if (value === "number") {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }
  };

  const applyFontSize = (fontSize: string) => {
    invariant(FONT_SIZES.includes(fontSize), "font size must be supported.");

    editor.update(() => {
      const selection = $getSelection();

      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, {
          "font-size": fontSize,
        });
      }
    });
  };

  const toggleLink = () => {
    invariant(Boolean(editor), "editor is required.");

    if (toolbarState.isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      return;
    }

    const url = window.prompt("Enter a link URL");
    if (!url) {
      return;
    }

    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
  };

  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] p-4">
      <div className="flex flex-wrap gap-2">
        <ToolbarButton
          disabled={!toolbarState.canUndo}
          label="Undo"
          onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        />
        <ToolbarButton
          disabled={!toolbarState.canRedo}
          label="Redo"
          onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        />
        <ToolbarButton
          active={toolbarState.isBold}
          label="Bold"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        />
        <ToolbarButton
          active={toolbarState.isItalic}
          label="Italic"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        />
        <ToolbarButton
          active={toolbarState.isUnderline}
          label="Underline"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        />
        <ToolbarButton
          active={toolbarState.isStrikethrough}
          label="Strike"
          onClick={() =>
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
          }
        />
        <ToolbarButton
          active={toolbarState.isLink}
          label="Link"
          onClick={toggleLink}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/75 px-3 py-2 text-sm font-semibold text-[var(--sage-dark)]">
          <span>Font size</span>
          <select
            className="bg-transparent outline-none"
            onChange={(event) => applyFontSize(event.target.value)}
            value={toolbarState.fontSize}
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/75 px-3 py-2 text-sm font-semibold text-[var(--sage-dark)]">
          <span>Block</span>
          <select
            className="bg-transparent outline-none"
            onChange={(event) =>
              applyBlockType(event.target.value as ToolbarState["blockType"])
            }
            value={toolbarState.blockType}
          >
            <option value="paragraph">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="quote">Quote</option>
            <option value="bullet">Bullet List</option>
            <option value="number">Number List</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function StatusBarPlugin() {
  invariant(typeof useState === "function", "React state must be available.");

  const [stats, setStats] = useState({ words: 0, characters: 0 });

  const handleChange = (editorState: EditorState) => {
    invariant(Boolean(editorState), "editorState is required.");

    editorState.read(() => {
      const textContent = $getRoot().getTextContent();
      const normalizedText = textContent.trim();

      setStats({
        characters: textContent.length,
        words: normalizedText ? normalizedText.split(/\s+/).length : 0,
      });
    });
  };

  return (
    <>
      <OnChangePlugin onChange={handleChange} />
      <div className="mt-4 flex gap-4 text-sm font-semibold text-[var(--muted)]">
        <span>{stats.words} words</span>
        <span>{stats.characters} characters</span>
      </div>
    </>
  );
}

type CapturePluginProps = {
  onChange: (payload: {
    plainText: string;
    wordCount: number;
    content: DraftContent;
  }) => void;
};

function CaptureDraftPlugin({ onChange }: CapturePluginProps) {
  invariant(typeof onChange === "function", "onChange must be a function.");

  const handleChange = (editorState: EditorState) => {
    invariant(Boolean(editorState), "editorState is required.");

    editorState.read(() => {
      const plainText = $getRoot().getTextContent();
      const normalizedText = plainText.trim();
      const wordCount = normalizedText ? normalizedText.split(/\s+/).length : 0;

      onChange({
        plainText,
        wordCount,
        content: editorState.toJSON() as DraftContent,
      });
    });
  };

  return <OnChangePlugin onChange={handleChange} />;
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

function getPublishedSuccessMessage(updatedAt: string) {
  invariantString(updatedAt, "updatedAt");

  return `Published ${new Date(updatedAt).toLocaleString()}`;
}

export function WriteEditor({
  initialDraft,
  initialProgress,
  showPromptPicker,
  dailyContest,
}: WriteEditorProps) {
  invariant(Boolean(initialProgress), "initialProgress is required.");
  invariant(typeof showPromptPicker === "boolean", "showPromptPicker must be boolean.");

  const [entryId, setEntryId] = useState(initialDraft?.id ?? null);
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [privateAuthorNote, setPrivateAuthorNote] = useState(
    initialDraft?.privateAuthorNote ?? ""
  );
  const [publicAuthorNote, setPublicAuthorNote] = useState(
    initialDraft?.publicAuthorNote ?? ""
  );
  const [visibility, setVisibility] = useState<"PRIVATE" | "FRIENDS" | "PUBLIC">(
    initialDraft?.visibility ?? "PRIVATE"
  );
  const [isNsfw, setIsNsfw] = useState(initialDraft?.isNsfw ?? false);
  const [isPrivateNoteOpen, setIsPrivateNoteOpen] = useState(() =>
    Boolean(initialDraft?.privateAuthorNote.trim())
  );
  const [isPublicNoteOpen, setIsPublicNoteOpen] = useState(() =>
    Boolean(initialDraft?.publicAuthorNote.trim())
  );
  const [plainText, setPlainText] = useState(initialDraft?.plainText ?? "");
  const [wordCount, setWordCount] = useState(initialDraft?.wordCount ?? 0);
  const [content, setContent] = useState<DraftContent>(() =>
    normalizeInitialContent(initialDraft?.content)
  );
  const [selectedPrompt, setSelectedPrompt] = useState<WritingPrompt | null>(
    initialDraft?.prompt ?? (dailyContest ? { id: `contest:${dailyContest.id}`, title: dailyContest.promptTitle, body: dailyContest.promptBody, genre: dailyContest.promptGenre, tags: [] } : null)
  );
  const [promptGenre, setPromptGenre] = useState(GENRES[0]);
  const [seenPromptIds, setSeenPromptIds] = useState<string[]>(
    initialDraft?.prompt ? [initialDraft.prompt.id] : []
  );
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptMessage, setPromptMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(
    initialDraft ? "Loaded published entry." : "Entry not published yet."
  );
  const [dailyProgress, setDailyProgress] = useState(initialProgress);
  const initialEditorState = useMemo(() => JSON.stringify(content), [content]);
  const progressPercent = Math.min(
    100,
    Math.round(
      (dailyProgress.wordsWritten / Math.max(dailyProgress.targetWords, 1)) *
        100
    )
  );

  const requestPrompt = async (resetSeenPrompts = false) => {
    invariant(typeof resetSeenPrompts === "boolean", "resetSeenPrompts must be boolean.");

    setIsLoadingPrompt(true);
    setPromptMessage("Finding a prompt...");

    const excludedIds = resetSeenPrompts ? [] : seenPromptIds;
    const query = new URLSearchParams({
      genre: promptGenre,
    });

    if (excludedIds.length > 0) {
      query.set("exclude", excludedIds.join(","));
    }

    try {
      const response = await fetch(`/api/prompts/random?${query.toString()}`);
      const data = (await response.json()) as {
        error?: string;
        prompt?: WritingPrompt;
      };

      if (!response.ok || !data.prompt) {
        if (!resetSeenPrompts && response.status === 404 && seenPromptIds.length > 0) {
          await requestPrompt(true);
          return;
        }

        setPromptMessage(data.error ?? "Unable to load a prompt.");
        return;
      }

      const nextPrompt = data.prompt;

      setSelectedPrompt(nextPrompt);
      setSeenPromptIds((current) =>
        resetSeenPrompts ? [nextPrompt.id] : [...current, nextPrompt.id]
      );
      setPromptMessage("Prompt selected.");
      setSaveMessage((current) =>
        current.startsWith("Published")
          ? "Entry has unpublished changes."
          : current
      );
    } catch {
      setPromptMessage("Unable to load a prompt.");
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  const publishEntry = async (): Promise<string | null> => {
    invariant(typeof entryId === "string" || entryId === null, "entryId must be a string or null.");
    invariantString(title, "title");
    invariantString(plainText, "plainText");
    invariant(Number.isFinite(wordCount), "wordCount must be finite.");

    setIsSaving(true);
    setSaveMessage("Publishing entry...");

    try {
      const response = await fetch("/api/entries/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entryId,
          title,
          plainText,
          content,
          wordCount,
          privateAuthorNote,
          publicAuthorNote,
          visibility,
          isNsfw,
          promptId: dailyContest ? null : selectedPrompt?.id ?? null,
        }),
      });

      const data = await readApiJson<
        PublishEntryResponse | ApiErrorResponse | LegacyErrorResponse
      >(response);
      const draft = getPublishDraft(data);
      const progress = getPublishProgress(data);

      if (!response.ok || !draft) {
        setSaveMessage(
          getApiErrorMessage(data, "Unable to publish entry.")
        );
        return null;
      }

      setEntryId(draft.id);
      if (progress) {
        setDailyProgress(progress);
      }
      setSaveMessage(getPublishedSuccessMessage(draft.updatedAt));
      return draft.id;
    } catch {
      setSaveMessage("Unable to publish entry. Check your connection and try again.");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const submitToContest = async () => {
    if (!dailyContest || !window.confirm("Contest entries are public and cannot be edited after submission.")) return;
    const savedEntryId = await publishEntry();
    if (!savedEntryId) return;
    setIsSaving(true);
    setSaveMessage("Submitting entry to contest...");
    try {
      const response = await fetch("/api/contest/entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contestId: dailyContest.id, entryId: savedEntryId }) });
      const data = await readApiJson<ApiErrorResponse | { ok: true }>(response);
      if (!response.ok) { setSaveMessage(getApiErrorMessage(data, "Unable to submit contest entry.")); return; }
      window.location.href = "/contest";
    } catch { setSaveMessage("Unable to submit contest entry."); } finally { setIsSaving(false); }
  };

  return (
    <LexicalComposer
      initialConfig={{
        ...editorConfig,
        editorState: initialEditorState,
      }}
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
        {showPromptPicker ? (
          <div className="mb-4 rounded-2xl border border-[var(--line)] bg-white/70 p-5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <label className="block min-w-52">
                <span className="mb-2 block text-sm font-bold text-[var(--charcoal)]">
                  Prompt genre
                </span>
                <select
                  className="app-field w-full px-4 py-3"
                  onChange={(event) => {
                    setPromptGenre(event.target.value);
                    setSeenPromptIds([]);
                    setPromptMessage("");
                  }}
                  value={promptGenre}
                >
                  {GENRES.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="app-button-primary px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
                disabled={isLoadingPrompt}
                onClick={() => requestPrompt()}
                type="button"
              >
                {isLoadingPrompt
                  ? "Finding..."
                  : selectedPrompt
                    ? "Try Another Prompt"
                    : "Request Prompt"}
              </button>
            </div>

            {selectedPrompt ? (
              <article className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words font-literary text-xl font-semibold text-[var(--charcoal)]">
                      {selectedPrompt.title}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                      {selectedPrompt.genre}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedPrompt.tags.map((tag) => (
                      <span
                        className="rounded-full bg-[var(--sage-soft)] px-3 py-1 text-xs font-bold text-[var(--sage-dark)]"
                        key={tag}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-3 font-literary text-base italic leading-7 text-[var(--charcoal)]/75">
                  {selectedPrompt.body}
                </p>
              </article>
            ) : null}

            {promptMessage ? (
              <p className="mt-3 text-sm font-semibold text-[var(--muted)]">{promptMessage}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mb-4 grid gap-4 rounded-2xl border border-[var(--line)] bg-white/70 p-5 shadow-[var(--shadow-soft)]">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[var(--charcoal)]">
              Title
            </span>
            <input
              className="app-field w-full px-4 py-3 font-literary text-2xl font-bold"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Untitled entry"
              type="text"
              value={title}
            />
          </label>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <button
                className="cursor-pointer text-sm font-bold text-[var(--sage-dark)] hover:text-[var(--charcoal)]"
                onClick={() => setIsPrivateNoteOpen((current) => !current)}
                type="button"
              >
                {isPrivateNoteOpen ? "- Hide private note" : "+ Add private note"}
              </button>
              {isPrivateNoteOpen ? (
                <label className="mt-3 block">
                  <span className="sr-only">Private note</span>
                  <textarea
                    className="app-field min-h-24 w-full px-4 py-3"
                    onChange={(event) =>
                      setPrivateAuthorNote(event.target.value)
                    }
                    placeholder="Notes only you can see..."
                    value={privateAuthorNote}
                  />
                </label>
              ) : null}
            </div>

            <div>
              <button
                className="cursor-pointer text-sm font-bold text-[var(--sage-dark)] hover:text-[var(--charcoal)]"
                onClick={() => setIsPublicNoteOpen((current) => !current)}
                type="button"
              >
                {isPublicNoteOpen ? "- Hide public note" : "+ Add public note"}
              </button>
              {isPublicNoteOpen ? (
                <label className="mt-3 block">
                  <span className="sr-only">Public note</span>
                  <textarea
                    className="app-field min-h-24 w-full px-4 py-3"
                    onChange={(event) =>
                      setPublicAuthorNote(event.target.value)
                    }
                    placeholder="Optional public context for this entry..."
                    value={publicAuthorNote}
                  />
                </label>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-[var(--charcoal)]">
                Visibility
              </span>
              <select
                className="app-field w-full px-4 py-3"
                onChange={(event) => {
                  setVisibility(
                    event.target.value as "PRIVATE" | "FRIENDS" | "PUBLIC"
                  );
                  setSaveMessage((current) =>
                    current.startsWith("Published")
                      ? "Entry has unpublished changes."
                      : current
                  );
                }}
                value={visibility}
              >
                <option value="PRIVATE">Private</option>
                <option value="FRIENDS">Friends</option>
                <option value="PUBLIC">Public</option>
              </select>
            </label>

            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] px-4 py-3 text-sm font-bold text-[var(--charcoal)]">
              <input
                checked={isNsfw}
                className="size-4 accent-[var(--sage)]"
                onChange={(event) => {
                  setIsNsfw(event.target.checked);
                  setSaveMessage((current) =>
                    current.startsWith("Published")
                      ? "Entry has unpublished changes."
                      : current
                  );
                }}
                type="checkbox"
              />
              NSFW
            </label>
          </div>
        </div>
        <ToolbarPlugin />
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-soft)]">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                aria-placeholder="Start drafting here..."
                className="min-h-[520px] px-6 py-6 font-literary text-lg leading-9 text-[var(--charcoal)] outline-none md:px-10 md:py-10"
                placeholder={<Placeholder />}
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
            placeholder={<Placeholder />}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <CaptureDraftPlugin
            onChange={(payload) => {
              setPlainText(payload.plainText);
              setWordCount(payload.wordCount);
              setContent(payload.content);
              setSaveMessage((current) =>
                current.startsWith("Published")
                  ? "Entry has unpublished changes."
                  : current
              );
            }}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div
            aria-live="polite"
            className="text-sm font-semibold text-[var(--muted)]"
          >
            {saveMessage}
          </div>
          <button
            className="app-button-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
            disabled={isSaving}
            onClick={() => void publishEntry()}
            type="button"
          >
            {isSaving ? (
              <>
                <Spinner label="Publishing entry" />
                Publishing...
              </>
            ) : (
              dailyContest ? "Save privately" : "Publish Entry"
            )}
          </button>
          {dailyContest ? <button className="app-button-primary inline-flex px-5 py-2.5 text-sm disabled:opacity-60" disabled={isSaving || wordCount < 100} onClick={submitToContest} type="button">Submit entry to contest</button> : null}
        </div>
        <StatusBarPlugin />
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-6 shadow-[var(--shadow-soft)]">
            <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--sage-dark)]">
              Active Prompt
            </h2>
            {selectedPrompt ? (
              <>
                <p className="mt-5 font-literary text-xl italic leading-8 text-[var(--charcoal)]">
                  {selectedPrompt.body}
                </p>
                <p className="mt-4 text-sm font-semibold text-[var(--muted)]">
                  {selectedPrompt.genre}
                </p>
              </>
            ) : (
              <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
                Choose a genre and request a prompt, or write from a blank page.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] p-6">
            <span className="inline-flex rounded-full bg-[var(--sunset-soft)] px-3 py-1 text-xs font-bold text-[var(--sunset)]">
              Today&apos;s words
            </span>
            <p className="mt-5 font-literary text-4xl font-bold text-[var(--sage-dark)]">
              {dailyProgress.wordsWritten.toLocaleString()}
            </p>
            <p className="text-sm font-semibold text-[var(--muted)]">
              of {dailyProgress.targetWords.toLocaleString()} private words
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-[var(--sage)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-3 text-xs font-semibold text-[var(--muted)]">
              {dailyProgress.goalMet
                ? "Daily target reached."
                : `${Math.max(
                    0,
                    dailyProgress.targetWords - dailyProgress.wordsWritten
                  ).toLocaleString()} words to today's target.`}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-semibold text-[var(--muted)]">
              <div className="rounded-2xl bg-white/75 p-3">
                <p className="font-literary text-2xl font-bold text-[var(--charcoal)]">
                  {dailyProgress.currentStreakDays}
                </p>
                <p>current streak</p>
              </div>
              <div className="rounded-2xl bg-white/75 p-3">
                <p className="font-literary text-2xl font-bold text-[var(--charcoal)]">
                  {dailyProgress.bestStreakDays}
                </p>
                <p>best streak</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </LexicalComposer>
  );
}
