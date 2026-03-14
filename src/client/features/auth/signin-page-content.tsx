"use client";

import FormHeading from "@/client/components/forms/form-heading";
import FormLink from "@/client/components/forms/form-link";
import { useLanguage } from "@/client/lib/language-context";
import LoginForm from "@/client/views/login-page";
import { t } from "@/shared/constants/translations";

export default function SignInPageContent() {
  const { language } = useLanguage();

  return (
    <div className="space-y-6">
      <FormHeading
        title={t("signInTitle", language)}
        description={t("signInDesc", language)}
      />
      <LoginForm />
      <FormLink
        question={t("newHere", language)}
        linkText={t("signUp", language)}
        href="/signup"
      />
    </div>
  );
}
