"use client";

import { useState } from "react";
import { AlertTriangle, Lock } from "lucide-react";

type AgeVerificationModalProps = {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function AgeVerificationModal({ isOpen, onConfirm, onCancel }: AgeVerificationModalProps) {
  const [inputValue, setInputValue] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (inputValue.trim().toLowerCase() === "i take responsibility") {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[var(--app-bg)] p-6 shadow-2xl ring-1 ring-white/10">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
            <AlertTriangle size={20} />
          </div>
          <h2 className="text-xl font-semibold text-[var(--app-text-heading)]">
            Pending Age Verification
          </h2>
        </div>
        
        <p className="mb-4 text-sm text-[var(--app-text-secondary)]">
          You have a pending verification for age-restricted content. To proceed, please confirm you are over 18 and acknowledge your responsibility for generating this content.
        </p>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-[var(--app-text-secondary)]">
            Type <strong>I take responsibility</strong> to confirm
          </label>
          <input
            type="text"
            autoFocus
            className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-soft)] px-4 py-2 text-[var(--app-text-primary)] focus:border-orange-500 focus:outline-none"
            placeholder="I take responsibility"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--app-text-secondary)] hover:bg-[var(--app-bg-soft)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={inputValue.trim().toLowerCase() !== "i take responsibility"}
            onClick={handleConfirm}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-orange-600"
          >
            Confirm & Proceed
          </button>
        </div>
      </div>
    </div>
  );
}
