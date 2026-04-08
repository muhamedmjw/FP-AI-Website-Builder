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
        className="prismatic-link-underline prismatic-text font-medium"
        href={href}
      >
        {linkText}
      </Link>
    </p>
  );
}
