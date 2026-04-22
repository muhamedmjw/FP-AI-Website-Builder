"use client";

import { Shield, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/client/lib/language-context";
import { t } from "@/shared/constants/translations";

type SafetyPoliciesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function SafetyPoliciesModal({ isOpen, onClose }: SafetyPoliciesModalProps) {
  const { language } = useLanguage();

  if (!isOpen) return null;

  const isRtl = language === "ar" || language === "ku";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--app-bg)] p-6 shadow-2xl ring-1 ring-white/10" dir={isRtl ? "rtl" : "ltr"}>
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--app-text-heading)]">
                {t("safetyPoliciesTitle", language)}
              </h2>
              <p className="text-sm text-[var(--app-text-tertiary)]">
                {t("safetyPoliciesSubtitle", language)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--app-text-tertiary)] transition hover:bg-[var(--app-bg-soft)] hover:text-[var(--app-text-heading)]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 text-sm text-[var(--app-text-secondary)]">
          <section>
            <h3 className="mb-2 text-base font-medium text-[var(--app-text-heading)]">{t("safetyProhibitedTitle", language)}</h3>
            <p className="mb-2">{t("safetyProhibitedDesc", language)}</p>
            <ul className={`${isRtl ? "mr-5" : "ml-5"} list-disc space-y-1`}>
              <li>{t("safetyProhibitedItem1", language)}</li>
              <li>{t("safetyProhibitedItem2", language)}</li>
              <li>{t("safetyProhibitedItem3", language)}</li>
              <li>{t("safetyProhibitedItem4", language)}</li>
              <li>{t("safetyProhibitedItem5", language)}</li>
              <li>{t("safetyProhibitedItem6", language)}</li>
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-base font-medium text-[var(--app-text-heading)]">{t("safetyAgeRestrictedTitle", language)}</h3>
            <p className="mb-2">{t("safetyAgeRestrictedDesc", language)}</p>
            <ul className={`${isRtl ? "mr-5" : "ml-5"} list-disc space-y-1`}>
              <li>{t("safetyAgeRestrictedItem1", language)}</li>
              <li>{t("safetyAgeRestrictedItem2", language)}</li>
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-base font-medium text-[var(--app-text-heading)]">{t("safetyAllowedTitle", language)}</h3>
            <p>
              {t("safetyAllowedDesc", language)}
            </p>
          </section>
        </div>

        <div className={`mt-8 flex ${isRtl ? "justify-start" : "justify-end"}`}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[var(--app-btn-primary-bg)] px-5 py-2.5 text-sm font-medium text-[var(--app-btn-primary-text)] hover:opacity-90"
          >
            {t("safetyPoliciesAcknowledge", language)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
