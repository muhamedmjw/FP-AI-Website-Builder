const PENDING_GUEST_ZIP_PROMPT_KEY = "pending_guest_zip_prompt";
const DEFAULT_ZIP_FILENAME = "website-files.zip";

function parseFilename(contentDisposition: string | null): string {
  if (!contentDisposition) {
    return DEFAULT_ZIP_FILENAME;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] ?? DEFAULT_ZIP_FILENAME;
}

export function savePendingGuestZipPrompt(prompt: string) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(PENDING_GUEST_ZIP_PROMPT_KEY, prompt);
}

export function readPendingGuestZipPrompt(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(PENDING_GUEST_ZIP_PROMPT_KEY);
}

export function consumePendingGuestZipPrompt(): string | null {
  const pendingPrompt = readPendingGuestZipPrompt();
  if (!pendingPrompt) {
    return null;
  }

  clearPendingGuestZipPrompt();
  return pendingPrompt;
}

export function clearPendingGuestZipPrompt() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(PENDING_GUEST_ZIP_PROMPT_KEY);
}

export async function requestWebsiteZip(prompt: string): Promise<{
  blob: Blob;
  filename: string;
}> {
  const response = await fetch("/api/guest/zip", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    let errorMessage = "Failed to generate ZIP file.";
    try {
      const data = (await response.json()) as { error?: unknown };
      if (typeof data.error === "string") {
        errorMessage = data.error;
      }
    } catch {
      // Ignore non-JSON error responses and use default message.
    }

    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  const filename = parseFilename(response.headers.get("content-disposition"));

  return { blob, filename };
}

export function triggerBrowserDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

export async function downloadWebsiteZip(prompt: string) {
  const { blob, filename } = await requestWebsiteZip(prompt);
  triggerBrowserDownload(blob, filename);
}
