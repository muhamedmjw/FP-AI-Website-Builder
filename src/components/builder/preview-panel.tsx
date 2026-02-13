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
      <div className="flex h-full items-center justify-center bg-slate-900">
        <div className="text-center">
          <p className="text-sm text-slate-500">No preview yet.</p>
          <p className="mt-1 text-xs text-slate-600">
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
