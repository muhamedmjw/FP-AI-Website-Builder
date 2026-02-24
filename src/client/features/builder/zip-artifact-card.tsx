import { Download, Package } from "lucide-react";

type ZipArtifactCardProps = {
  zipName: string;
  fileCount: number;
  folderCount: number;
  createdAt: string;
  onDownload: () => void;
};

export default function ZipArtifactCard({
  zipName,
  fileCount,
  folderCount,
  createdAt,
  onDownload,
}: ZipArtifactCardProps) {
  return (
    <div className="ui-fade-up mr-auto flex w-full max-w-4xl flex-col gap-3 rounded-2xl border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-3 py-3 shadow-[var(--app-shadow-sm)] sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[var(--app-text-heading)]">
          <Package size={16} />
          <p className="truncate text-sm font-semibold">{zipName}</p>
        </div>
        <p className="mt-1 text-xs text-[var(--app-text-secondary)]">
          {fileCount} files | {folderCount} folders |{" "}
          {new Date(createdAt).toLocaleString()}
        </p>
      </div>
      <button
        type="button"
        onClick={onDownload}
        className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--app-btn-primary-bg)] px-3 py-2 text-sm font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-btn-primary-hover)] hover:shadow-[var(--app-shadow-md)] hover:-translate-y-px active:translate-y-0 sm:w-auto"
      >
        <Download size={14} />
        Download ZIP
      </button>
    </div>
  );
}
