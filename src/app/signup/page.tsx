import FormHeading from "@/client/components/forms/form-heading";
import FormLink from "@/client/components/forms/form-link";
import PageShell from "@/client/components/forms/page-shell";
import SignupForm from "@/client/components/forms/signup-form";

export default function SignupPage() {
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
        <FormLink question="Already have an account?" linkText="Sign in" href="/signin" />
      </div>
    </PageShell>
  );
}
