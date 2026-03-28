"use client";

import { useLanguage } from "@/client/lib/language-context";
import { getPromptSuggestions } from "@/shared/constants/suggestions";

type PromptSuggestionsProps = {
  onSend: (prompt: string) => void;
};

export default function PromptSuggestions({ onSend }: PromptSuggestionsProps) {
  const { language } = useLanguage();
  const suggestions = getPromptSuggestions(language);

  return (
    <div className="mt-4">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            onClick={() => onSend(suggestion.prompt)}
            className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-1.5 text-xs font-medium text-[var(--app-text-secondary)] transition hover:bg-[var(--app-hover-bg)] hover:text-[var(--app-text-heading)]"
            title={suggestion.prompt}
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}
