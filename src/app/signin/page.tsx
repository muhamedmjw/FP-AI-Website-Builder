import FormHeading from "@/components/forms/form-heading";
import FormLink from "@/components/forms/form-link";
import LoginForm from "@/components/forms/login-form";
import PageShell from "@/components/forms/page-shell";

export default function SignInPage() {
  return (
    <PageShell
      title="Welcome back"
      subtitle="Sign in to continue building AI-powered websites with clean structure and reusable layouts."
    >
      <div className="space-y-6">
        <FormHeading
          title="Sign in"
          description="Use your email and password to access your workspace."
        />
        <LoginForm />
        <FormLink question="New here?" linkText="Create an account" href="/signup" />
      </div>
    </PageShell>
  );
}
