type MaybeAuthError = {
  name?: string;
  message?: string;
  status?: number;
  __isAuthError?: boolean;
};

/** Detects Supabase's "no active auth session" error shape across environments. */
export function isMissingSessionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as MaybeAuthError;

  if (maybeError.name === "AuthSessionMissingError") {
    return true;
  }

  if (
    maybeError.__isAuthError &&
    maybeError.status === 400 &&
    typeof maybeError.message === "string" &&
    maybeError.message.toLowerCase().includes("auth session missing")
  ) {
    return true;
  }

  return false;
}
