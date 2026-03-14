import PageShell from "@/client/components/forms/page-shell";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageShell>{children}</PageShell>;
}
