import type { generateAIResponse } from "@/server/services/ai-service";
import {
  countReferencedUserImagePaths,
  forceApplyUploadedImagesToHtml,
  injectUploadedImagesForPreview,
  normalizeGeneratedHtmlForStorage,
  type HtmlImageAsset,
} from "@/shared/utils/html-images";

function promptRequestsUploadedImageSwap(prompt: string): boolean {
  const normalizedPrompt = prompt.toLowerCase();

  const hasActionWord = /(replace|swap|change|use|apply|set|update)/.test(
    normalizedPrompt
  );
  const hasImageWord = /image/.test(normalizedPrompt);
  const hasUploadHint = /(uploaded|attach|attached|image\s*[1-9])/.test(
    normalizedPrompt
  );

  return hasActionWord && hasImageWord && hasUploadHint;
}

/**
 * Converts AI output into persisted HTML and preview HTML.
 * It also forces uploaded-image replacement when the prompt explicitly asks for it.
 */
export function handleHtmlGeneration(params: {
  aiResponse: Awaited<ReturnType<typeof generateAIResponse>>;
  existingWebsiteId: string | null;
  existingHtml: string | null;
  content: string;
  userImages: HtmlImageAsset[];
  websiteImagePool: HtmlImageAsset[];
}): {
  htmlToSave: string | null;
  htmlForPreview?: string;
} {
  const {
    aiResponse,
    existingWebsiteId,
    existingHtml,
    content,
    userImages,
    websiteImagePool,
  } = params;

  const trimmedContent = content.trim();
  const shouldForceUploadedImageSwap =
    promptRequestsUploadedImageSwap(trimmedContent) && userImages.length > 0;

  let htmlToSave: string | null = null;
  let htmlForPreview: string | undefined;

  if (aiResponse.type === "website") {
    let normalizedHtml = normalizeGeneratedHtmlForStorage(aiResponse.html, userImages);

    if (shouldForceUploadedImageSwap) {
      const referencedImageCount = countReferencedUserImagePaths(
        normalizedHtml,
        userImages
      );

      if (referencedImageCount === 0) {
        const fallbackHtml =
          existingHtml && existingHtml.trim().length > 0
            ? existingHtml
            : normalizedHtml;

        const forcedReplacement = forceApplyUploadedImagesToHtml(
          fallbackHtml,
          userImages,
          trimmedContent
        );

        if (forcedReplacement.replacedCount > 0) {
          normalizedHtml = forcedReplacement.html;
        }
      }
    }

    htmlToSave = normalizedHtml;
    htmlForPreview = injectUploadedImagesForPreview(normalizedHtml, websiteImagePool);
  } else if (existingWebsiteId && existingHtml && shouldForceUploadedImageSwap) {
    const forcedReplacement = forceApplyUploadedImagesToHtml(
      existingHtml,
      userImages,
      trimmedContent
    );

    if (forcedReplacement.replacedCount > 0) {
      htmlToSave = forcedReplacement.html;
      htmlForPreview = injectUploadedImagesForPreview(
        forcedReplacement.html,
        websiteImagePool
      );
    }
  }

  return { htmlToSave, htmlForPreview };
}
