"use client";

import { FormEvent, useState } from "react";
import FormInput from "@/client/components/forms/form-input";
import PrimaryButton from "@/client/components/ui/primary-button";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";
import { localizeAuthErrorMessage } from "@/shared/utils/localized-errors";

export default function LoginForm() {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setIsLoading(false);
      setErrorMessage(t("emailPasswordRequired", language));
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setIsLoading(false);

    if (error) {
      setErrorMessage(localizeAuthErrorMessage(error.message, language));
      return;
    }

    window.location.assign("/");
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <FormInput
        label={t("email", language)}
        name="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
      />
      <FormInput
        label={t("password", language)}
        name="password"
        type="password"
        placeholder="********"
        autoComplete="current-password"
        required
      />
      <PrimaryButton
        type="submit"
        label={isLoading ? `${t("signIn", language)}...` : t("signIn", language)}
        fullWidth
        disabled={isLoading}
      />
      {errorMessage ? (
        <p className="text-sm text-rose-400" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
