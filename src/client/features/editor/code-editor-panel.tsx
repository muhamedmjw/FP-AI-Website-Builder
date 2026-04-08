"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Check, Copy, Save, Wand2, X } from "lucide-react";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";
import type * as Monaco from "monaco-editor";

type CodeEditorPanelProps = {
  html: string;
  onChange: (html: string) => void;
  onSave: () => Promise<void>;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
};

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
  const [localHtml, setLocalHtml] = useState(html);
  const [theme, setTheme] = useState<"vs-dark" | "light">("vs-dark");
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const saveResetTimerRef = useRef<number | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const formatTooltipText = t("formatTooltip", language);
  const copyTooltipText = t("copyTooltip", language);
  const formatTooltipStyle = {
    "--tooltip-content": toTooltipContent(formatTooltipText),
  } as CSSProperties;
  const copyTooltipStyle = {
    "--tooltip-content": toTooltipContent(copyTooltipText),
  } as CSSProperties;

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

  useEffect(() => {
    setLocalHtml(html);
  }, [html]);

  useEffect(() => {
    if (localHtml === html) {
      return;
    }

    const timeout = window.setTimeout(() => {
      onChange(localHtml);
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [localHtml, html, onChange]);

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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(localHtml);
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

    if (localHtml !== html) {
      onChange(localHtml);
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

  return (
    <div dir="ltr" className="flex h-full min-w-0 flex-col border-l border-(--app-border) bg-(--app-panel)">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-(--app-border) px-3">
        <div className="flex-1" />
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
          language="html"
          theme={theme}
          value={localHtml}
          onChange={(value) => setLocalHtml(value ?? "")}
          onMount={handleMount}
          options={editorOptions}
        />
      </div>
    </div>
  );
}
