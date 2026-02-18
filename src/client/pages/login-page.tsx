"use client";

import { FormEvent, useState } from "react";
import FormInput from "@/client/components/forms/form-input";
import PrimaryButton from "@/client/components/ui/primary-button";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";

export default function LoginForm() {
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
      setErrorMessage("Email and password are required.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setIsLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setErrorMessage("Your email is not confirmed yet. Check your inbox and confirm your account first.");
        return;
      }

      setErrorMessage(error.message);
      return;
    }

    window.location.assign("/");
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <FormInput
        label="Email"
        name="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
      />
      <FormInput
        label="Password"
        name="password"
        type="password"
        placeholder="********"
        autoComplete="current-password"
        required
      />
      <PrimaryButton
        type="submit"
        label={isLoading ? "Signing in..." : "Sign in"}
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
