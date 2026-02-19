type FormHeadingProps = {
  title: string;
  description: string;
};

export default function FormHeading({ title, description }: FormHeadingProps) {
  return (
    <header className="space-y-2">
      <h2 className="text-2xl font-semibold text-[var(--app-text-heading)]">{title}</h2>
      <p className="text-sm text-[var(--app-text-tertiary)]">{description}</p>
    </header>
  );
}
