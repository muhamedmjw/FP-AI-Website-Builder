import FormHeading from "@/components/forms/form-heading";
import FormInput from "@/components/forms/form-input";
import FormLink from "@/components/forms/form-link";
import PageShell from "@/components/forms/page-shell";
import PrimaryButton from "@/components/ui/primary-button";

export default function LoginPage() {
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

        <form className="space-y-4">
          <FormInput label="Email" name="email" type="email" placeholder="you@example.com" />
          <FormInput label="Password" name="password" type="password" placeholder="********" />
          <div className="flex items-center justify-between text-sm text-slate-400">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-700" />
              Remember me
            </label>
            <span className="text-slate-500">Forgot password?</span>
          </div>
          <PrimaryButton type="button" label="Sign in" fullWidth />
        </form>

        <FormLink question="New here?" linkText="Create an account" href="/signup" />
      </div>
    </PageShell>
  );
}
