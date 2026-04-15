"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "@/client/lib/language-context";
import type { AppLanguage } from "@/shared/types/database";

export default function AuthLanguageSync({ dbLanguage }: { dbLanguage: AppLanguage | null }) {
  const { language, setLanguage } = useLanguage();
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      
      // If we have a DB language, we use it ONLY IF the user hasn't explicitly
      // set a preferred language locally (e.g. while they were a guest).
      if (dbLanguage && dbLanguage !== language) {
        try {
          const explicitlySet = window.localStorage.getItem("app-language-explicit");
          if (!explicitlySet) {
            setLanguage(dbLanguage);
          }
        } catch {
          // Ignore
        }
      }
    }
  }, [dbLanguage, language, setLanguage]);

  return null;
}
