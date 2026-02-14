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
      className={`rainbow-hover inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 ${
        fullWidth ? "w-full" : ""
      }`}
    >
      {label}
    </button>
  );
}
