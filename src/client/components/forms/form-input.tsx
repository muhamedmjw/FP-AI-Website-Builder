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
  return (
    <label className="grid gap-2 text-sm text-[var(--app-text-secondary)]">
      <span className="font-medium text-[var(--app-text-heading)]">{label}</span>
      <input
        className="h-11 rounded-xl border border-[var(--app-input-border)] bg-[var(--app-input-bg)] px-4 text-sm text-[var(--app-input-text)] placeholder:text-[var(--app-input-placeholder)] transition focus:border-[var(--app-input-focus-border)] focus:outline-none"
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
      />
    </label>
  );
}
