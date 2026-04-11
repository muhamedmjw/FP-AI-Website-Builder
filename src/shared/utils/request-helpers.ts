/**
 * Safely extracts a string field from an unknown request payload.
 * This keeps route validation readable and avoids repeated type guards.
 */
export function extractStringField(body: unknown, fieldName: string): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = (body as Record<string, unknown>)[fieldName];
  return typeof value === "string" ? value : null;
}

/**
 * Safely extracts a boolean field from an unknown request payload.
 */
export function extractBooleanField(body: unknown, fieldName: string): boolean | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const value = (body as Record<string, unknown>)[fieldName];
  return typeof value === "boolean" ? value : null;
}

/**
 * Extracts a de-duplicated, trimmed list of non-empty strings from a request field.
 */
export function extractStringArrayField(body: unknown, fieldName: string): string[] {
  if (!body || typeof body !== "object") {
    return [];
  }

  const value = (body as Record<string, unknown>)[fieldName];
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}
