"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type FormInputProps = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
};

export default function FormInput({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete = "off",
  required = false,
  minLength,
  maxLength,
}: FormInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <label className="grid gap-2 text-sm text-[var(--app-text-secondary)]">
      <span className="font-medium text-[var(--app-text-heading)]">{label}</span>
      <div className="relative">
        <input
          className={`h-11 w-full rounded-xl border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-4 text-sm text-[var(--app-input-text)] placeholder:text-[var(--app-input-placeholder)] transition focus:border-[var(--app-input-focus-border)] focus:outline-none ${
            isPassword ? "pr-12" : ""
          }`}
          name={name}
          type={inputType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--app-text-secondary)] transition hover:bg-[var(--app-input-focus-border)]/10 hover:text-[var(--app-text-heading)] focus:outline-none"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </label>
  );
}

