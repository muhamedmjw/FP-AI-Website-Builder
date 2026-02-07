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
    <label className="grid gap-2 text-sm text-slate-300">
      <span className="font-medium text-slate-200">{label}</span>
      <input
        className="h-11 rounded-xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100 placeholder:text-slate-600 focus:border-slate-500 focus:outline-none"
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete="off"
      />
    </label>
  );
}
