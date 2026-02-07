import FormHeading from "@/components/forms/form-heading";
import FormInput from "@/components/forms/form-input";
import FormLink from "@/components/forms/form-link";
import PageShell from "@/components/forms/page-shell";
import PrimaryButton from "@/components/ui/primary-button";

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

        <form className="space-y-4">
          <FormInput label="Full name" name="fullName" placeholder="Your name" />
          <FormInput label="Email" name="email" type="email" placeholder="you@example.com" />
          <FormInput label="Password" name="password" type="password" placeholder="Create a password" />
          <FormInput
            label="Confirm password"
            name="confirmPassword"
            type="password"
            placeholder="Repeat password"
          />
          <PrimaryButton type="button" label="Create account" fullWidth />
        </form>

        <FormLink question="Already have an account?" linkText="Sign in" href="/login" />
      </div>
    </PageShell>
  );
}
