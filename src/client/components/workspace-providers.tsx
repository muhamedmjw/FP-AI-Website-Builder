"use client";

import { LanguageProvider } from "@/client/lib/language-context";
import PendingChatSync from "@/client/components/pending-chat-sync";
import NavigationLoadingCursor from "@/client/components/navigation-loading-cursor";
import type { AppLanguage } from "@/shared/types/database";

type WorkspaceProvidersProps = {
  children: React.ReactNode;
  language: AppLanguage;
  hasLanguagePreference: boolean;
};

export default function WorkspaceProviders({
  children,
  language,
  hasLanguagePreference,
}: WorkspaceProvidersProps) {
  return (
    <LanguageProvider
      initialLanguage={language}
      hasInitialLanguagePreference={hasLanguagePreference}
    >
      <NavigationLoadingCursor />
      <PendingChatSync />
      {children}
    </LanguageProvider>
  );
}
