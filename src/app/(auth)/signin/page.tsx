import FormHeading from "@/client/components/forms/form-heading";
import FormLink from "@/client/components/forms/form-link";
import LoginForm from "@/client/views/login-page";

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <FormHeading
        title="Sign in"
        description="Use your email and password to access your workspace."
      />
      <LoginForm />
      <FormLink question="New here?" linkText="Create an account" href="/signup" />
    </div>
  );
}
