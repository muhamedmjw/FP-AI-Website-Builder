import Link from "next/link";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getPublicWebsiteHtml } from "@/server/services/website-service";
import { t } from "@/shared/constants/translations";

type PublicPreviewPageProps = {
  params: Promise<{ chatId: string }>;
};

export default async function PublicPreviewPage({ params }: PublicPreviewPageProps) {
  const { chatId } = await params;
  const supabase = await getSupabaseServerClient();
  const result = await getPublicWebsiteHtml(supabase, chatId);

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-6 text-center">
        <div className="max-w-md rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <p className="text-lg font-semibold text-[var(--app-text-heading)]">
            {t("publicPreviewUnavailableTitle", "en")}
          </p>
          <p className="mt-2 text-sm text-[var(--app-text-tertiary)]">
            {t("publicPreviewUnavailableDesc", "en")}
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]"
          >
            {t("backToBuilder", "en")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-bg)]">
      <iframe
        title="Public Website Preview"
        srcDoc={result.html}
        sandbox="allow-scripts allow-same-origin allow-popups"
        className="min-h-0 flex-1 border-0 bg-white"
      />

      <footer className="flex items-center justify-center border-t border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-2 text-xs text-[var(--app-text-tertiary)]">
        <span>
          {t("builtWith", "en")}{" "}
          <Link href="/" className="text-[var(--app-text-secondary)] hover:text-[var(--app-text-heading)]">
            AI Website Builder
          </Link>
        </span>
      </footer>
    </div>
  );
}
