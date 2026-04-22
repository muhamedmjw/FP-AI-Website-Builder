"use client";

import { Shield, X } from "lucide-react";
import { createPortal } from "react-dom";

type SafetyPoliciesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function SafetyPoliciesModal({ isOpen, onClose }: SafetyPoliciesModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--app-bg)] p-6 shadow-2xl ring-1 ring-white/10">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--app-text-heading)]">
                Safety & Ethical Policies
              </h2>
              <p className="text-sm text-[var(--app-text-tertiary)]">
                Guidelines for using our AI Website Builder
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
            <h3 className="mb-2 text-base font-medium text-[var(--app-text-heading)]">1. Prohibited Content (Chat Lock)</h3>
            <p className="mb-2">We enforce strict boundaries to ensure a safe environment for all users. Generating websites related to the following topics is strictly prohibited and will result in your chat being permanently locked:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Explicit NSFW material, pornography, and adult content.</li>
              <li>Adult entertainment venues such as nightclubs and strip clubs.</li>
              <li>Hate speech, promotion of violence, or offensive historical figures (e.g., Hitler, Saddam Hussein).</li>
              <li>Casinos, betting platforms, and gambling.</li>
              <li>Governmental or political campaign websites.</li>
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-base font-medium text-[var(--app-text-heading)]">2. Age-Restricted Content (Verification Required)</h3>
            <p className="mb-2">Some topics are allowed but require you to confirm you are over 18 years of age and take full responsibility for the generated content. These include:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Alcohol sales, bars, and pubs.</li>
              <li>Tobacco, cigar lounges, and vape shops.</li>
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-base font-medium text-[var(--app-text-heading)]">3. Allowed Content</h3>
            <p>
              You are free to generate websites for standard businesses, e-commerce stores, portfolios, blogs, restaurants (including those serving pork), and cafes. If you have any questions regarding a specific use case, please test it out or contact our support team.
            </p>
          </section>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[var(--app-btn-primary-bg)] px-5 py-2.5 text-sm font-medium text-[var(--app-btn-primary-text)] hover:opacity-90"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
