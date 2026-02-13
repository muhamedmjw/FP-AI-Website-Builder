type PrimaryButtonProps = {
  type?: "button" | "submit" | "reset";
  label: string;
  fullWidth?: boolean;
};

export default function PrimaryButton({
  type = "button",
  label,
  fullWidth,
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      className={`rainbow-hover inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 ${
        fullWidth ? "w-full" : ""
      }`}
    >
      {label}
    </button>
  );
}
