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
import {
  getContestSubmissionRequirements,
  STORY_GENRES,
  type StoryGenre,
} from "@/lib/entry-policy";
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
const PROMPT_GENRES = STORY_GENRES.filter((genre) => genre !== "Other");

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
  storyGenre: string | null;
  customStoryGenre: string | null;
  prompt: WritingPrompt | null;
};

type WriteEditorProps = {
  initialDraft: DraftEntry | null;
  initialProgress: WritingProgress;
  showPromptPicker: boolean;
  dailyContest: {
    id: string;
    contestDate: string;
    promptTitle: string;
    promptBody: string;
    promptGenre: string;
    submissionsCloseAt: string;
    submissionsOpen: boolean;
  } | null;
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
  const [storyGenre, setStoryGenre] = useState<StoryGenre | null>(
    (initialDraft?.storyGenre as StoryGenre | null) ?? null
  );
  const [customStoryGenre, setCustomStoryGenre] = useState(
    initialDraft?.customStoryGenre ?? ""
  );
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
  const [promptGenre, setPromptGenre] = useState<string>(PROMPT_GENRES[0]);
  const [seenPromptIds, setSeenPromptIds] = useState<string[]>(
    initialDraft?.prompt ? [initialDraft.prompt.id] : []
  );
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptMessage, setPromptMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmissionReviewOpen, setIsSubmissionReviewOpen] = useState(false);
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
  const submissionRequirements = getContestSubmissionRequirements({
    title,
    storyGenre,
    wordCount,
  });

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

  const getEntryPayload = () => ({
    entryId,
    title,
    plainText,
    content,
    wordCount,
    privateAuthorNote,
    publicAuthorNote,
    visibility,
    isNsfw,
    storyGenre,
    customStoryGenre,
    promptId:
      selectedPrompt?.id.startsWith("contest:")
        ? null
        : selectedPrompt?.id ?? null,
  });

  const saveEntry = async (): Promise<string | null> => {
    invariant(typeof entryId === "string" || entryId === null, "entryId must be a string or null.");
    invariantString(title, "title");
    invariantString(plainText, "plainText");
    invariant(Number.isFinite(wordCount), "wordCount must be finite.");

    setIsSaving(true);
    setSaveMessage(dailyContest ? "Saving draft..." : "Publishing entry...");

    try {
      const response = await fetch("/api/entries/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getEntryPayload()),
      });

      const data = await readApiJson<
        PublishEntryResponse | ApiErrorResponse | LegacyErrorResponse
      >(response);
      const draft = getPublishDraft(data);
      const progress = getPublishProgress(data);

      if (!response.ok || !draft) {
        setSaveMessage(
          getApiErrorMessage(
            data,
            dailyContest ? "Unable to save draft." : "Unable to publish entry."
          )
        );
        return null;
      }

      setEntryId(draft.id);
      if (progress) {
        setDailyProgress(progress);
      }
      setSaveMessage(
        dailyContest
          ? `Draft saved ${new Date(draft.updatedAt).toLocaleString()}`
          : getPublishedSuccessMessage(draft.updatedAt)
      );
      return draft.id;
    } catch {
      setSaveMessage(
        dailyContest
          ? "Unable to save draft. Check your connection and try again."
          : "Unable to publish entry. Check your connection and try again."
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const submitToContest = async () => {
    if (!dailyContest || !entryId || !submissionRequirements.isReady) return;
    setIsSaving(true);
    setSaveMessage("Submitting entry to contest...");
    try {
      const response = await fetch("/api/contest/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getEntryPayload()),
      });
      const data = await readApiJson<
        ApiErrorResponse | {
          ok: true;
          data: { contestEntry: { id: string } };
        }
      >(response);
      if (!response.ok) { setSaveMessage(getApiErrorMessage(data, "Unable to submit contest entry.")); return; }
      if (!data || !("data" in data)) {
        setSaveMessage("Unable to confirm contest submission.");
        return;
      }
      window.location.href = `/contest/${dailyContest.contestDate}?submitted=${data.data.contestEntry.id}#entry-${data.data.contestEntry.id}`;
    } catch { setSaveMessage("Unable to submit contest entry."); } finally { setIsSaving(false); }
  };

  const continueAsNormalWriting = async () => {
    if (
      !dailyContest ||
      !entryId ||
      !window.confirm(
        "Continue as normal writing? This draft will no longer be eligible for today's contest. Your work will be saved and moved to the standard editor."
      )
    ) {
      return;
    }

    setIsSaving(true);
    setSaveMessage("Saving and moving to the standard editor...");
    try {
      const response = await fetch("/api/contest/drafts/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getEntryPayload()),
      });
      const data = await readApiJson<ApiErrorResponse | { ok: true }>(response);
      if (!response.ok) {
        setSaveMessage(
          getApiErrorMessage(data, "Unable to continue as normal writing.")
        );
        return;
      }
      window.location.href = `/write?entryId=${entryId}`;
    } catch {
      setSaveMessage("Unable to continue as normal writing.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <LexicalComposer
      initialConfig={{
        ...editorConfig,
        editorState: initialEditorState,
      }}
    >
      <>
      {dailyContest ? (
        <section className="mb-6 rounded-2xl border border-[var(--line)] bg-white/75 p-6 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-4xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--sage-dark)]">
                Today&apos;s contest prompt
              </p>
              <h2 className="mt-3 font-literary text-2xl font-bold text-[var(--charcoal)]">
                {dailyContest.promptTitle}
              </h2>
              <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
                {dailyContest.promptGenre}
              </p>
              <p className="mt-4 font-literary text-lg italic leading-8 text-[var(--charcoal)]">
                {dailyContest.promptBody}
              </p>
              <p className="mt-4 text-sm font-bold text-[var(--sunset)]">
                {dailyContest.submissionsOpen
                  ? "Submissions close today at 11:59 PM CT"
                  : "Contest closed — this draft can no longer be submitted"}
              </p>
            </div>
            <button
              className="app-button-secondary px-4 py-2.5 text-sm disabled:opacity-60"
              disabled={isSaving}
              onClick={() => void continueAsNormalWriting()}
              type="button"
            >
              Continue as normal writing
            </button>
          </div>
        </section>
      ) : null}
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
                  {PROMPT_GENRES.map((genre) => (
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

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            {!dailyContest ? (
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
                  }}
                  value={visibility}
                >
                  <option value="PRIVATE">Private</option>
                  <option value="FRIENDS">Friends</option>
                  <option value="PUBLIC">Public</option>
                </select>
              </label>
            ) : null}

            <div>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[var(--charcoal)]">
                  Story genre{dailyContest ? " (required)" : " (optional)"}
                </span>
                <select
                  className="app-field w-full px-4 py-3"
                  onChange={(event) =>
                    setStoryGenre(
                      event.target.value
                        ? (event.target.value as StoryGenre)
                        : null
                    )
                  }
                  value={storyGenre ?? ""}
                >
                  {!dailyContest ? <option value="">Not categorized</option> : null}
                  {STORY_GENRES.map((genre) => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </label>
              {storyGenre === "Other" ? (
                <label className="mt-3 block">
                  <span className="sr-only">Custom story genre</span>
                  <input
                    className="app-field w-full px-4 py-3"
                    maxLength={48}
                    onChange={(event) => setCustomStoryGenre(event.target.value)}
                    placeholder="Optional custom genre"
                    value={customStoryGenre}
                  />
                </label>
              ) : null}
            </div>

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
        {dailyContest ? (
          <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white/70 p-4">
            <p className="text-sm font-bold text-[var(--charcoal)]">Ready to submit</p>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
              <li className={submissionRequirements.hasTitle ? "text-[var(--sage-dark)]" : "text-[var(--sunset)]"}>
                {submissionRequirements.hasTitle ? "✓" : "○"} Title added
              </li>
              <li className={submissionRequirements.hasStoryGenre ? "text-[var(--sage-dark)]" : "text-[var(--sunset)]"}>
                {submissionRequirements.hasStoryGenre ? "✓" : "○"} Story genre selected
              </li>
              <li className={submissionRequirements.hasMinimumWords ? "text-[var(--sage-dark)]" : "text-[var(--sunset)]"}>
                {submissionRequirements.hasMinimumWords ? "✓" : "○"} At least 100 words
              </li>
            </ul>
          </div>
        ) : null}
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
            onClick={() => void saveEntry()}
            type="button"
          >
            {isSaving ? (
              <>
                <Spinner label={dailyContest ? "Saving draft" : "Publishing entry"} />
                {dailyContest ? "Saving..." : "Publishing..."}
              </>
            ) : (
              dailyContest ? "Save draft" : "Publish Entry"
            )}
          </button>
          {dailyContest ? <button className="app-button-primary inline-flex px-5 py-2.5 text-sm disabled:opacity-60" disabled={isSaving || !dailyContest.submissionsOpen || !submissionRequirements.isReady} onClick={() => setIsSubmissionReviewOpen(true)} type="button">Submit to daily contest</button> : null}
        </div>
        {dailyContest && isSubmissionReviewOpen ? (
          <div
            aria-modal="true"
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
            role="dialog"
          >
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
              <h2 className="font-literary text-2xl font-bold">Submit this entry?</h2>
              <dl className="mt-5 grid gap-3 rounded-2xl bg-[var(--paper-soft)] p-4 text-sm">
                <div><dt className="font-bold">Title</dt><dd>{title.trim()}</dd></div>
                <div><dt className="font-bold">Story genre</dt><dd>{storyGenre === "Other" && customStoryGenre.trim() ? customStoryGenre.trim() : storyGenre}</dd></div>
                <div><dt className="font-bold">Word count</dt><dd>{wordCount.toLocaleString()}</dd></div>
              </dl>
              <p className="mt-4 text-sm font-bold text-[var(--sunset)]">
                Contest entries are public and cannot be edited after submission.
              </p>
              {isNsfw ? <p className="mt-2 text-sm text-[var(--muted)]">This entry is marked NSFW and will be shown according to each viewer&apos;s contest preference.</p> : null}
              <div className="mt-6 flex justify-end gap-3">
                <button className="app-button-secondary px-4 py-2" onClick={() => setIsSubmissionReviewOpen(false)} type="button">Keep editing</button>
                <button className="app-button-primary px-4 py-2" disabled={isSaving} onClick={() => void submitToContest()} type="button">Submit entry</button>
              </div>
            </div>
          </div>
        ) : null}
        <StatusBarPlugin />
        </div>

        <aside className="space-y-4">
          {!dailyContest ? <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-6 shadow-[var(--shadow-soft)]">
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
          </div> : null}

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
      </>
    </LexicalComposer>
  );
}
