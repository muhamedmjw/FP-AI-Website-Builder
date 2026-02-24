"use client";

import { FormEvent, useState } from "react";
import FormInput from "@/client/components/forms/form-input";
import PrimaryButton from "@/client/components/ui/primary-button";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";

export default function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!fullName || !email || !password || !confirmPassword) {
      setIsLoading(false);
      setErrorMessage("All fields are required.");
      return;
    }

    if (password.length < 8) {
      setIsLoading(false);
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

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
      window.location.assign("/");
      return;
    }

    setSuccessMessage("Account created. Check your email and confirm your account before logging in.");
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <FormInput
        label="Full name"
        name="fullName"
        placeholder="Your name"
        autoComplete="name"
        required
        minLength={2}
        maxLength={60}
      />
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
        placeholder="Create a password"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <FormInput
        label="Confirm password"
        name="confirmPassword"
        type="password"
        placeholder="Repeat password"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <PrimaryButton
        type="submit"
        label={isLoading ? "Creating..." : "Create account"}
        fullWidth
        disabled={isLoading}
      />
      {errorMessage ? (
        <p className="text-sm text-rose-400" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-emerald-400" role="status">
          {successMessage}
        </p>
      ) : null}
    </form>
  );
}
