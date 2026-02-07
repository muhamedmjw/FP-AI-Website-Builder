"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import FormInput from "@/components/forms/form-input";
import PrimaryButton from "@/components/ui/primary-button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export default function SignupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setIsLoading(false);
      setErrorMessage("Passwords do not match.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: fullName,
        },
      },
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data.session) {
      router.push("/");
      return;
    }

    setSuccessMessage("Account created. Check your email and confirm your account before logging in.");
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <FormInput label="Full name" name="fullName" placeholder="Your name" />
      <FormInput label="Email" name="email" type="email" placeholder="you@example.com" />
      <FormInput label="Password" name="password" type="password" placeholder="Create a password" />
      <FormInput
        label="Confirm password"
        name="confirmPassword"
        type="password"
        placeholder="Repeat password"
      />
      <PrimaryButton type="submit" label={isLoading ? "Creating..." : "Create account"} fullWidth />
      {errorMessage ? <p className="text-sm text-rose-400">{errorMessage}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-400">{successMessage}</p> : null}
    </form>
  );
}
