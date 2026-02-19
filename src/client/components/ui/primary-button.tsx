type PrimaryButtonProps = {
  type?: "button" | "submit" | "reset";
  label: string;
  fullWidth?: boolean;
  disabled?: boolean;
};

export default function PrimaryButton({
  type = "button",
  label,
  fullWidth,
  disabled = false,
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center rounded-xl bg-[var(--app-btn-primary-bg)] px-5 text-sm font-semibold text-[var(--app-btn-primary-text)] shadow-[var(--app-shadow-sm)] transition hover:bg-[var(--app-btn-primary-hover)] hover:shadow-[var(--app-shadow-md)] hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${
        fullWidth ? "w-full" : ""
      }`}
    >
      {label}
    </button>
  );
}
