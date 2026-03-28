"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Copy, Wand2 } from "lucide-react";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";
import type * as Monaco from "monaco-editor";

type CodeEditorPanelProps = {
  html: string;
  onChange: (html: string) => void;
};

export default function CodeEditorPanel({ html, onChange }: CodeEditorPanelProps) {
  const { language } = useLanguage();
  const [localHtml, setLocalHtml] = useState(html);
  const [theme, setTheme] = useState<"vs-dark" | "light">("vs-dark");
  const [copySuccess, setCopySuccess] = useState(false);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  const editorOptions = useMemo<Monaco.editor.IStandaloneEditorConstructionOptions>(
    () => ({
      minimap: { enabled: false },
      fontSize: 13,
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

  return (
    <div className="flex h-full min-w-0 flex-col border-l border-(--app-border) bg-(--app-panel)">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-(--app-border) px-3">
        <p className="text-sm font-semibold text-(--app-text-heading)">
          {t("editor", language)}
        </p>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => void handleFormat()}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-(--app-border) px-2.5 text-xs font-medium text-(--app-text-secondary) transition hover:bg-(--app-hover-bg) hover:text-(--app-text-heading)"
          title={t("format", language)}
        >
          <Wand2 size={14} />
          {t("format", language)}
        </button>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-(--app-border) px-2.5 text-xs font-medium text-(--app-text-secondary) transition hover:bg-(--app-hover-bg) hover:text-(--app-text-heading)"
          title={t("copy", language)}
        >
          <Copy size={14} />
          {copySuccess ? t("copied", language) : t("copy", language)}
        </button>
      </div>

      <div className="min-h-0 flex-1">
        <Editor
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
