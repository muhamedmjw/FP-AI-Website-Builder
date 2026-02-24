import { Globe } from "lucide-react";

/**
 * Preview panel — renders the generated HTML inside a sandboxed iframe.
 * Takes up the right side of the builder split view.
 */

type PreviewPanelProps = {
  html: string | null;
};

export default function PreviewPanel({ html }: PreviewPanelProps) {
  if (!html) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--app-bg-soft)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <Globe size={32} className="text-[var(--app-text-muted)]" />
          <p className="text-sm text-[var(--app-text-tertiary)]">No preview yet.</p>
          <p className="text-xs text-[var(--app-text-muted)]">
            Send a message to generate your website.
          </p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      title="Website Preview"
      srcDoc={html}
      sandbox="allow-scripts"
      className="h-full w-full border-0 bg-white"
    />
  );
}
