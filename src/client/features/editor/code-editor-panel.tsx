"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Check, Copy, Save, Wand2, X } from "lucide-react";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";
import {
  MAIN_SCRIPT_MARKER,
  STYLESHEET_LINK_MARKER,
  mergeHtmlDocumentAssets,
  splitHtmlDocumentAssets,
} from "@/shared/utils/html-assets";
import type * as Monaco from "monaco-editor";

type CodeEditorPanelProps = {
  html: string;
  onChange: (html: string) => void;
  onSave: () => Promise<void>;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
};

type VirtualFile = "index" | "css" | "js";

function toTooltipContent(value: string): string {
  return `"${value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\A ")
    .replace(/"/g, '\\"')}"`;
}

export default function CodeEditorPanel({
  html,
  onChange,
  onSave,
  isSaving = false,
  hasUnsavedChanges = false,
}: CodeEditorPanelProps) {
  const { language } = useLanguage();
  const [localIndex, setLocalIndex] = useState(
    () => splitHtmlDocumentAssets(html).indexHtml
  );
  const [localCss, setLocalCss] = useState(() => splitHtmlDocumentAssets(html).css);
  const [localJs, setLocalJs] = useState(() => splitHtmlDocumentAssets(html).js);
  const [activeFile, setActiveFile] = useState<VirtualFile>("index");
  const [theme, setTheme] = useState<"vs-dark" | "light">("vs-dark");
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const saveResetTimerRef = useRef<number | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const lastPushedMergedRef = useRef<string | null>(null);
  const formatTooltipText = t("formatTooltip", language);
  const copyTooltipText = t("copyTooltip", language);
  const formatTooltipStyle = {
    "--tooltip-content": toTooltipContent(formatTooltipText),
  } as CSSProperties;
  const copyTooltipStyle = {
    "--tooltip-content": toTooltipContent(copyTooltipText),
  } as CSSProperties;

  const mergedHtml = useMemo(
    () => mergeHtmlDocumentAssets(localIndex, localCss, localJs),
    [localIndex, localCss, localJs]
  );

  const showCssTab =
    localIndex.includes(STYLESHEET_LINK_MARKER) || localCss.length > 0;
  const showJsTab = localIndex.includes(MAIN_SCRIPT_MARKER) || localJs.length > 0;

  const editorOptions = useMemo<Monaco.editor.IStandaloneEditorConstructionOptions>(
    () => ({
      minimap: { enabled: false },
      fontSize: 13,
      fontFamily: "var(--font-ui), monospace",
      automaticLayout: true,
      smoothScrolling: true,
      padding: { top: 12, bottom: 12 },
      scrollBeyondLastLine: false,
      wordWrap: "on",
      formatOnPaste: true,
      formatOnType: true,
    }),
    []
  );

  const monacoLanguage =
    activeFile === "index" ? "html" : activeFile === "css" ? "css" : "javascript";

  const activeValue =
    activeFile === "index" ? localIndex : activeFile === "css" ? localCss : localJs;

  useEffect(() => {
    if (html === lastPushedMergedRef.current) {
      lastPushedMergedRef.current = null;
      return;
    }

    const parts = splitHtmlDocumentAssets(html);
    setLocalIndex(parts.indexHtml);
    setLocalCss(parts.css);
    setLocalJs(parts.js);
  }, [html]);

  useEffect(() => {
    if (activeFile === "css" && !showCssTab) {
      setActiveFile("index");
    }
    if (activeFile === "js" && !showJsTab) {
      setActiveFile("index");
    }
  }, [activeFile, showCssTab, showJsTab]);

  useEffect(() => {
    if (mergedHtml === html) {
      return;
    }

    const timeout = window.setTimeout(() => {
      lastPushedMergedRef.current = mergedHtml;
      onChange(mergedHtml);
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [mergedHtml, html, onChange]);

  useEffect(() => {
    const resolveTheme = () =>
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "vs-dark"
        : "light";

    setTheme(resolveTheme());

    const observer = new MutationObserver(() => {
      setTheme(resolveTheme());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (saveResetTimerRef.current !== null) {
        window.clearTimeout(saveResetTimerRef.current);
      }
    },
    []
  );

  const handleMount: OnMount = (editorInstance) => {
    editorRef.current = editorInstance;
  };

  function setActiveValue(next: string) {
    if (activeFile === "index") {
      setLocalIndex(next);
    } else if (activeFile === "css") {
      setLocalCss(next);
    } else {
      setLocalJs(next);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(mergedHtml);
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 1400);
    } catch {
      setCopySuccess(false);
    }
  }

  async function handleFormat() {
    const editor = editorRef.current;
    if (!editor) return;

    const formatAction = editor.getAction("editor.action.formatDocument");
    if (!formatAction) return;

    await formatAction.run();
  }

  async function handleSave() {
    if (isSaving) {
      return;
    }

    if (mergedHtml !== html) {
      lastPushedMergedRef.current = mergedHtml;
      onChange(mergedHtml);
    }

    if (saveResetTimerRef.current !== null) {
      window.clearTimeout(saveResetTimerRef.current);
      saveResetTimerRef.current = null;
    }

    try {
      await onSave();
      setSaveStatus("saved");
      saveResetTimerRef.current = window.setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch {
      setSaveStatus("error");
      saveResetTimerRef.current = window.setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    }
  }

  const saveButtonTitle = hasUnsavedChanges
    ? t("unsavedChangesWarning", language)
    : "Save";

  const saveButtonClassName = isSaving
    ? "flex h-8 items-center gap-1.5 rounded-lg border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-2.5 text-xs font-medium text-[var(--app-text-secondary)] opacity-70"
    : saveStatus === "saved"
      ? "flex h-8 items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2.5 text-xs font-medium text-emerald-400"
      : saveStatus === "error"
        ? "flex h-8 items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-500/10 px-2.5 text-xs font-medium text-rose-400"
        : "flex h-8 items-center gap-1.5 rounded-lg border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-2.5 text-xs font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]";

  const saveLabel = isSaving
    ? t("savingChanges", language)
    : saveStatus === "saved"
      ? t("savedChanges", language)
      : saveStatus === "error"
        ? t("saveError", language)
        : "Save";

  const selectClassName =
    "h-8 max-w-[min(220px,42vw)] shrink-0 rounded-lg border border-(--app-border) bg-(--app-panel) px-2 text-xs text-(--app-text-secondary) outline-none transition hover:border-(--app-text-tertiary) focus-visible:ring-2 focus-visible:ring-sky-500/40";

  return (
    <div dir="ltr" className="flex h-full min-w-0 flex-col border-l border-(--app-border) bg-(--app-panel)">
      <div className="flex h-12 shrink-0 flex-wrap items-center gap-2 border-b border-(--app-border) px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-(--app-text-tertiary)"
            aria-hidden="true"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span className="shrink-0 text-xs font-semibold text-(--app-text-tertiary) uppercase tracking-widest">
            Editor
          </span>
          <label htmlFor="code-editor-file" className="sr-only">
            File
          </label>
          <select
            id="code-editor-file"
            value={activeFile}
            onChange={(event) => setActiveFile(event.target.value as VirtualFile)}
            className={selectClassName}
            aria-label="Select file"
          >
            <option value="index">index.html</option>
            {showCssTab ? <option value="css">assets/css/styles.css</option> : null}
            {showJsTab ? <option value="js">assets/js/main.js</option> : null}
          </select>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          title={saveButtonTitle}
          className={`relative ${saveButtonClassName} ${isSaving ? "cursor-not-allowed" : ""}`}
        >
          {hasUnsavedChanges ? (
            <span
              className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_0_1px_rgba(2,6,23,0.7)]"
              aria-hidden="true"
            />
          ) : null}
          {isSaving ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
          ) : saveStatus === "saved" ? (
            <Check size={13} />
          ) : saveStatus === "error" ? (
            <X size={13} />
          ) : (
            <Save size={13} />
          )}
          {saveLabel}
        </button>
        <div
          className="group relative inline-flex before:pointer-events-none before:absolute before:bottom-[calc(100%+2px)] before:left-1/2 before:z-50 before:-translate-x-1/2 before:border-x-4 before:border-b-4 before:border-x-transparent before:border-b-(--app-card-border) before:opacity-0 before:transition-opacity before:duration-150 before:delay-400 after:pointer-events-none after:absolute after:bottom-[calc(100%+6px)] after:left-1/2 after:z-50 after:w-max after:max-w-72 after:-translate-x-1/2 after:rounded-lg after:border after:border-(--app-card-border) after:bg-(--app-panel) after:px-2.5 after:py-1.5 after:text-xs after:text-(--app-text-secondary) after:whitespace-pre-line after:opacity-0 after:transition-opacity after:duration-150 after:delay-400 after:content-(--tooltip-content) group-hover:before:opacity-100 group-hover:after:opacity-100"
          style={formatTooltipStyle}
        >
          <button
            type="button"
            onClick={() => void handleFormat()}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-(--app-border) px-2.5 text-xs font-medium text-(--app-text-secondary) transition hover:bg-(--app-hover-bg) hover:text-(--app-text-heading)"
            title={formatTooltipText}
          >
            <Wand2 size={13} />
            Format
          </button>
        </div>
        <div
          className="group relative inline-flex before:pointer-events-none before:absolute before:bottom-[calc(100%+2px)] before:left-1/2 before:z-50 before:-translate-x-1/2 before:border-x-4 before:border-b-4 before:border-x-transparent before:border-b-(--app-card-border) before:opacity-0 before:transition-opacity before:duration-150 before:delay-400 after:pointer-events-none after:absolute after:bottom-[calc(100%+6px)] after:left-1/2 after:z-50 after:w-max after:max-w-72 after:-translate-x-1/2 after:rounded-lg after:border after:border-(--app-card-border) after:bg-(--app-panel) after:px-2.5 after:py-1.5 after:text-xs after:text-(--app-text-secondary) after:opacity-0 after:transition-opacity after:duration-150 after:delay-400 after:content-(--tooltip-content) group-hover:before:opacity-100 group-hover:after:opacity-100"
          style={copyTooltipStyle}
        >
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-(--app-border) px-2.5 text-xs font-medium text-(--app-text-secondary) transition hover:bg-(--app-hover-bg) hover:text-(--app-text-heading)"
            title={copyTooltipText}
          >
            <Copy size={14} />
            {copySuccess ? t("copied", language) : "Copy"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <Editor
          key={`code-editor-${language}`}
          language={monacoLanguage}
          theme={theme}
          value={activeValue}
          onChange={(value) => setActiveValue(value ?? "")}
          onMount={handleMount}
          options={editorOptions}
        />
      </div>
    </div>
  );
}
