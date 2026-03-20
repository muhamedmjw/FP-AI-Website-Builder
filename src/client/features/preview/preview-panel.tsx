import { useState } from "react";
import { Globe, Monitor, Tablet, Smartphone, Download, X, Check } from "lucide-react";
import { useLanguage } from "@/client/lib/language-context";
import { RTL_LANGUAGES } from "@/shared/constants/languages";
import { t } from "@/shared/constants/translations";

/**
 * Preview panel — renders the generated HTML inside a sandboxed iframe
 * with a single unified toolbar (device toggles + download/close) and a polished empty state.
 */

type PreviewPanelProps = {
  html: string | null;
  onDownload?: () => void;
  isDownloading?: boolean;
  downloadSuccess?: boolean;
  onClose?: () => void;
};

type DeviceMode = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<DeviceMode, string | undefined> = {
  desktop: undefined,
  tablet: "768px",
  mobile: "390px",
};

export default function PreviewPanel({
  html,
  onDownload,
  isDownloading = false,
  downloadSuccess = false,
  onClose,
}: PreviewPanelProps) {
  const { language } = useLanguage();
  const shouldFixToolbarOrder = RTL_LANGUAGES.includes(language);
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [iframeKey, setIframeKey] = useState(0);

  if (!html) {
    return (
      <div
        className="flex h-full items-center justify-center bg-[var(--app-bg-soft)]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="flex flex-col items-center gap-4 text-center px-6">
          {/* Glowing globe */}
          <div className="relative flex items-center justify-center">
            <div className="absolute h-20 w-20 rounded-full bg-indigo-500/15 animate-pulse" />
            <Globe size={40} className="relative text-indigo-400" />
          </div>
          <p className="text-base font-semibold text-[var(--app-text-heading)]">
            Your website preview
          </p>
          <p className="max-w-[240px] text-sm text-[var(--app-text-muted)]">
            Describe a website in the chat to see it here
          </p>
        </div>
      </div>
    );
  }

  const maxW = DEVICE_WIDTHS[device];

  return (
    <div
      className="flex h-full flex-col bg-[var(--app-bg-soft)]"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Single unified toolbar */}
      <div
        dir={shouldFixToolbarOrder ? "ltr" : undefined}
        className="flex h-12 shrink-0 items-center gap-1.5 border-b border-[var(--app-border)] bg-[var(--app-panel)] px-3"
      >
        {/* Left: device toggles */}
        {(
          [
            { mode: "desktop" as const, Icon: Monitor, label: "Desktop" },
            { mode: "tablet" as const, Icon: Tablet, label: "Tablet" },
            { mode: "mobile" as const, Icon: Smartphone, label: "Mobile" },
          ] as const
        ).map(({ mode, Icon, label }) => (
          <button
            key={mode}
            type="button"
            onClick={() => setDevice(mode)}
            title={label}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
              device === mode
                ? "bg-[var(--app-hover-bg-strong)] text-[var(--app-text-heading)]"
                : "text-[var(--app-text-muted)] hover:text-[var(--app-text-secondary)] hover:bg-[var(--app-hover-bg)]"
            }`}
          >
            <Icon size={15} />
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: Download ZIP + Close */}
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-black shadow-sm transition-all hover:-translate-y-0.5 hover:bg-neutral-100 hover:shadow-md disabled:pointer-events-none disabled:opacity-70"
            title={t("downloadZip", language)}
          >
            {isDownloading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
            ) : downloadSuccess ? (
              <Check size={14} />
            ) : (
              <Download size={14} />
            )}
            {isDownloading
              ? t("downloadZipPreparing", language)
              : downloadSuccess
                ? t("downloadZipDone", language)
                : t("downloadZip", language)}
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--app-hover-bg)] text-[var(--app-text-tertiary)] transition hover:bg-[var(--app-hover-bg-strong)] hover:text-[var(--app-text-heading)]"
            title="Close preview"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Iframe wrapper */}
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-3">
        <div
          className={`flex h-full flex-col overflow-hidden ${
            maxW ? "rounded-xl shadow-lg border border-[var(--app-border)]" : "w-full"
          }`}
          style={{
            maxWidth: maxW ?? "100%",
            width: "100%",
          }}
        >
          <iframe
            key={iframeKey}
            title="Website Preview"
            srcDoc={html}
            sandbox="allow-scripts allow-same-origin allow-popups"
            className="min-h-0 flex-1 border-0 bg-white"
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
