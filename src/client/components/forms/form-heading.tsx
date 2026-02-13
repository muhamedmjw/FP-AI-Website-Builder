type FormHeadingProps = {
  title: string;
  description: string;
};

export default function FormHeading({ title, description }: FormHeadingProps) {
  return (
    <header className="space-y-2">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="text-sm text-neutral-500">{description}</p>
    </header>
  );
}
