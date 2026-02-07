import FormHeading from "@/components/forms/form-heading";
import FormLink from "@/components/forms/form-link";
import PageShell from "@/components/forms/page-shell";
import SignupForm from "@/components/forms/signup-form";

export default function RegisterPage() {
  return (
    <PageShell
      title="Create your workspace"
      subtitle="Set up a new account and start generating full website structures from a single prompt."
    >
      <div className="space-y-6">
        <FormHeading
          title="Create account"
          description="Enter your details to make a new account."
        />
        <SignupForm />
        <FormLink question="Already have an account?" linkText="Sign in" href="/login" />
      </div>
    </PageShell>
  );
}
