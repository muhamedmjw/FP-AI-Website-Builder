"use client";

import Link from "next/link";
import FormHeading from "@/client/components/forms/form-heading";
import FormLink from "@/client/components/forms/form-link";
import { useLanguage } from "@/client/lib/language-context";
import SignupForm from "@/client/views/signup-page";
import { t } from "@/shared/constants/translations";

export default function SignUpPageContent() {
  const { language } = useLanguage();

  return (
    <div className="space-y-6">
      <FormHeading
        title={t("signUpTitle", language)}
        description={t("signUpDesc", language)}
      />
      <SignupForm />
      <div className="-mt-2 space-y-2">
        <FormLink
          question={t("alreadyHaveAccount", language)}
          linkText={t("signIn", language)}
          href="/signin"
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
