"use client";

import Link from "next/link";
import FormHeading from "@/client/components/forms/form-heading";
import FormLink from "@/client/components/forms/form-link";
import { useLanguage } from "@/client/lib/language-context";
import LoginForm from "@/client/views/login-form";
import { t } from "@/shared/constants/translations";

export default function SignInLayout() {
  const { language } = useLanguage();

  return (
    <div className="space-y-6">
      <FormHeading
        title={t("signInTitle", language)}
        description={t("signInDesc", language)}
      />
      <LoginForm />
      <div className="-mt-2 space-y-2">
        <FormLink
          question={t("newHere", language)}
          linkText={t("signUp", language)}
          href="/signup"
        />
        <p className="text-sm text-neutral-500">
          <Link
            className="prismatic-link-underline prismatic-text font-medium"
            href="/guest"
          >
            {t("continueAsGuest", language)}
          </Link>
        </p>
      </div>
    </div>
  );
}
