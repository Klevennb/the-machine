"use client";

import { useCallback, useEffect, useState } from "react";
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

function Placeholder() {
  return (
    <div className="pointer-events-none absolute left-5 top-5 text-slate-400">
      Start drafting here...
    </div>
  );
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

export function WriteEditor() {
  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className="rounded-[1.75rem] border border-slate-200 bg-white">
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
        </div>
        <StatusBarPlugin />
      </div>
    </LexicalComposer>
  );
}
