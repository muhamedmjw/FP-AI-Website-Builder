import PageShell from "@/client/components/forms/page-shell";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageShell
      title="Welcome back"
      subtitle="Sign in to continue building AI-powered websites with clean structure and reusable layouts."
    >
      {children}
    </PageShell>
  );
}
