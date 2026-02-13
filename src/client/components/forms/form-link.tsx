import Link from "next/link";

type FormLinkProps = {
  question: string;
  linkText: string;
  href: string;
};

export default function FormLink({ question, linkText, href }: FormLinkProps) {
  return (
    <p className="text-sm text-neutral-500">
      {question}{" "}
      <Link
        className="prismatic-text font-medium underline-offset-4 hover:underline"
        href={href}
      >
        {linkText}
      </Link>
    </p>
  );
}
