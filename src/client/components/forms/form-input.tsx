type FormInputProps = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
};

export default function FormInput({
  label,
  name,
  type = "text",
  placeholder,
}: FormInputProps) {
  return (
    <label className="grid gap-2 text-sm text-neutral-400">
      <span className="font-medium text-neutral-300">{label}</span>
      <input
        className="h-11 rounded-xl border border-white/[0.08] bg-[#0e0e0e] px-4 text-sm text-neutral-100 placeholder:text-neutral-600 transition focus:border-white/20 focus:outline-none"
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete="off"
      />
    </label>
  );
}
