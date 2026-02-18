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
    <div className="ui-fade-up mr-auto flex w-full max-w-4xl items-center justify-between gap-3 rounded-2xl border border-white/[0.1] bg-[#141414] px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-neutral-100">
          <Package size={16} />
          <p className="truncate text-sm font-semibold">{zipName}</p>
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          {fileCount} files | {folderCount} folders |{" "}
          {new Date(createdAt).toLocaleString()}
        </p>
      </div>
      <button
        type="button"
        onClick={onDownload}
        className="rainbow-hover prismatic-shadow inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
      >
        <Download size={14} />
        Download ZIP
      </button>
    </div>
  );
}
