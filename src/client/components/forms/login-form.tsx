"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import FormInput from "@/client/components/forms/form-input";
import PrimaryButton from "@/client/components/ui/primary-button";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";

export default function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

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

    router.push("/");
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <FormInput label="Email" name="email" type="email" placeholder="you@example.com" />
      <FormInput label="Password" name="password" type="password" placeholder="********" />
      <PrimaryButton type="submit" label={isLoading ? "Signing in..." : "Sign in"} fullWidth />
      {errorMessage ? <p className="text-sm text-rose-400">{errorMessage}</p> : null}
    </form>
  );
}
