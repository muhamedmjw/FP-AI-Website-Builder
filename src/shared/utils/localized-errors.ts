import { t } from "@/shared/constants/translations";
import type { AppLanguage } from "@/shared/types/database";

function normalizeMessage(message: string): string {
  return message.trim().toLowerCase();
}

export function localizeAuthErrorMessage(
  rawMessage: string,
  language: AppLanguage
): string {
  const normalized = normalizeMessage(rawMessage);

  if (!normalized) {
    return t("invalidLoginCredentials", language);
  }

  if (normalized.includes("email not confirmed")) {
    return t("emailNotConfirmed", language);
  }

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return t("invalidLoginCredentials", language);
  }

  return rawMessage;
}

export function localizeGuestChatErrorMessage(
  rawMessage: string,
  language: AppLanguage
): string {
  const normalized = normalizeMessage(rawMessage);

  if (!normalized) {
    return t("failedToGetResponse", language);
  }

  if (normalized.includes("guest limit reached")) {
    return t("guestLimitReached", language);
  }

  if (
    normalized.includes("internal server error") ||
    normalized.includes("something went wrong") ||
    normalized.includes("failed to send message")
  ) {
    return t("failedToGetResponse", language);
  }

  return rawMessage;
}