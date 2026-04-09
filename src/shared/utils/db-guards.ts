type DatabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

/**
 * Detects schema drift where upload-related columns are missing from public.files.
 */
export function isMissingUploadColumns(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const dbError = error as DatabaseLikeError;
  const combinedMessage = [dbError.message, dbError.details, dbError.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return (
    dbError.code === "42703" ||
    (combinedMessage.includes("is_user_upload") && combinedMessage.includes("column")) ||
    (combinedMessage.includes("mime_type") && combinedMessage.includes("column"))
  );
}
