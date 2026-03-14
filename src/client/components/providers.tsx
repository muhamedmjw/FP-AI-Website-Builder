"use client";

import { LanguageProvider } from "@/client/lib/language-context";

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
