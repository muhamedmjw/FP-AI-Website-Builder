"use client";

import AuthLanguageSync from "@/client/components/auth-language-sync";
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
    <>
      <AuthLanguageSync
        dbLanguage={hasLanguagePreference ? language : null}
      />
      <NavigationLoadingCursor />
      <PendingChatSync />
      {children}
    </>
  );
}
