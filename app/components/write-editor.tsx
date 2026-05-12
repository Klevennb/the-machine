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
  prompt: WritingPrompt | null;
};

type WriteEditorProps = {
  initialDraft: DraftEntry | null;
  showPromptPicker: boolean;
};

type WritingPrompt = {
  id: string;
  title: string;
  body: string;
  genre: string;
  tags: string[];
};

function Placeholder() {
  return (
    <div className="pointer-events-none absolute left-5 top-5 text-slate-400">
      Start drafting here...
    </div>
  );
}

function createEmptyEditorState(): DraftContent {
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
  return (
    <button
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      } disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function getToolbarState(editor: LexicalEditor): ToolbarState {
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
  const [toolbarState, setToolbarState] = useState<ToolbarState>(() =>
    getToolbarState(editor)
  );

  const refreshToolbar = useCallback(() => {
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
    <div className="mb-4 space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
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
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
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

        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
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
  const [stats, setStats] = useState({ words: 0, characters: 0 });

  const handleChange = (editorState: EditorState) => {
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
      <div className="mt-4 flex gap-4 text-sm text-slate-500">
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
  const handleChange = (editorState: EditorState) => {
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

export function WriteEditor({ initialDraft, showPromptPicker }: WriteEditorProps) {
  const [entryId, setEntryId] = useState(initialDraft?.id ?? null);
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [privateAuthorNote, setPrivateAuthorNote] = useState(
    initialDraft?.privateAuthorNote ?? ""
  );
  const [publicAuthorNote, setPublicAuthorNote] = useState(
    initialDraft?.publicAuthorNote ?? ""
  );
  const [plainText, setPlainText] = useState(initialDraft?.plainText ?? "");
  const [wordCount, setWordCount] = useState(initialDraft?.wordCount ?? 0);
  const [content, setContent] = useState<DraftContent>(() =>
    normalizeInitialContent(initialDraft?.content)
  );
  const [selectedPrompt, setSelectedPrompt] = useState<WritingPrompt | null>(
    initialDraft?.prompt ?? null
  );
  const [promptGenre, setPromptGenre] = useState(GENRES[0]);
  const [seenPromptIds, setSeenPromptIds] = useState<string[]>(
    initialDraft?.prompt ? [initialDraft.prompt.id] : []
  );
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptMessage, setPromptMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(
    initialDraft ? "Loaded saved entry." : "Entry not saved yet."
  );
  const initialEditorState = useMemo(() => JSON.stringify(content), [content]);

  const requestPrompt = async (resetSeenPrompts = false) => {
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
        current.startsWith("Saved") ? "Draft has unsaved changes." : current
      );
    } catch {
      setPromptMessage("Unable to load a prompt.");
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  const saveDraft = async () => {
    setIsSaving(true);
    setSaveMessage("Saving entry...");

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
          promptId: selectedPrompt?.id ?? null,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        draft?: { id: string; updatedAt: string };
      };

      if (!response.ok || !data.draft) {
        setSaveMessage(data.error ?? "Unable to save entry.");
        return;
      }

      setEntryId(data.draft.id);
      setSaveMessage(
        `Saved ${new Date(data.draft.updatedAt).toLocaleString()}`
      );
    } catch {
      setSaveMessage("Unable to save entry.");
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
      <div className="rounded-[1.75rem] border border-slate-200 bg-white">
        {showPromptPicker ? (
          <div className="mb-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <label className="block min-w-52">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Prompt genre
                </span>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
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
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
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
              <article className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-lg font-semibold text-slate-950">
                      {selectedPrompt.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedPrompt.genre}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedPrompt.tags.map((tag) => (
                      <span
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                        key={tag}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {selectedPrompt.body}
                </p>
              </article>
            ) : null}

            {promptMessage ? (
              <p className="mt-3 text-sm text-slate-500">{promptMessage}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mb-4 grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Title
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Untitled draft"
              type="text"
              value={title}
            />
          </label>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Private note
              </span>
              <textarea
                className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                onChange={(event) => setPrivateAuthorNote(event.target.value)}
                placeholder="Notes only you can see..."
                value={privateAuthorNote}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Public note
              </span>
              <textarea
                className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                onChange={(event) => setPublicAuthorNote(event.target.value)}
                placeholder="Optional public context for this entry..."
                value={publicAuthorNote}
              />
            </label>
          </div>
        </div>
        <ToolbarPlugin />
        <div className="relative overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                aria-placeholder="Start drafting here..."
                className="min-h-[360px] px-5 py-5 text-base leading-8 text-slate-800 outline-none"
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
                current.startsWith("Saved") ? "Draft has unsaved changes." : current
              );
            }}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-500">{saveMessage}</div>
          <button
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSaving}
            onClick={saveDraft}
            type="button"
          >
            {isSaving ? "Saving..." : "Save Entry"}
          </button>
        </div>
        <StatusBarPlugin />
      </div>
    </LexicalComposer>
  );
}
