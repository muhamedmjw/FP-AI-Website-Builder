export type HtmlImageAsset = {
  fileName: string;
  dataUri: string;
};

export function normalizeGeneratedHtmlForStorage(
  html: string,
  userImages: HtmlImageAsset[]
): string {
  let nextHtml = html;

  for (const image of userImages) {
    if (!image.dataUri || !image.fileName) {
      continue;
    }

    nextHtml = nextHtml.replaceAll(
      `src="${image.dataUri}"`,
      `src="${image.fileName}"`
    );
    nextHtml = nextHtml.replaceAll(
      `src='${image.dataUri}'`,
      `src="${image.fileName}"`
    );
  }

  return nextHtml;
}

export function countReferencedUserImagePaths(
  html: string,
  userImages: HtmlImageAsset[]
): number {
  const normalizedHtml = html.toLowerCase();
  let count = 0;

  for (const image of userImages) {
    const variants = [image.fileName, `./${image.fileName}`, `/${image.fileName}`];

    if (variants.some((variant) => normalizedHtml.includes(variant.toLowerCase()))) {
      count += 1;
    }
  }

  return count;
}

export function replaceImgSrcSequentially(
  html: string,
  userImages: HtmlImageAsset[]
): { html: string; replacedCount: number } {
  let imageIndex = 0;
  let replacedCount = 0;

  const nextHtml = html.replace(/<img\b[^>]*>/gi, (imgTag) => {
    if (imageIndex >= userImages.length) {
      return imgTag;
    }

    if (!/\bsrc=(['"]).*?\1/i.test(imgTag)) {
      return imgTag;
    }

    const fileName = userImages[imageIndex]?.fileName;
    if (!fileName) {
      return imgTag;
    }

    imageIndex += 1;
    replacedCount += 1;

    return imgTag.replace(/\bsrc=(['"]).*?\1/i, `src="${fileName}"`);
  });

  return { html: nextHtml, replacedCount };
}

export function forceApplyUploadedImagesToHtml(
  html: string,
  userImages: HtmlImageAsset[],
  prompt: string
): { html: string; replacedCount: number } {
  if (userImages.length === 0) {
    return { html, replacedCount: 0 };
  }

  if (/featured\s+projects?/i.test(prompt)) {
    let replacedInSection = 0;
    const sectionAdjusted = html.replace(
      /<section\b[^>]*>[\s\S]*?<\/section>/gi,
      (sectionHtml) => {
        if (!/featured\s+projects?/i.test(sectionHtml)) {
          return sectionHtml;
        }

        const replaced = replaceImgSrcSequentially(sectionHtml, userImages);
        replacedInSection += replaced.replacedCount;
        return replaced.html;
      }
    );

    if (replacedInSection > 0) {
      return { html: sectionAdjusted, replacedCount: replacedInSection };
    }
  }

  if (/(profile|avatar|hero|about\s+me|about\s+section)/i.test(prompt)) {
    const preferredImage = userImages[0];

    if (preferredImage?.fileName) {
      let replacedInSection = 0;
      const sectionAdjusted = html.replace(
        /<section\b[^>]*>[\s\S]*?<\/section>/gi,
        (sectionHtml) => {
          if (!/(hero|about|profile|avatar)/i.test(sectionHtml)) {
            return sectionHtml;
          }

          const replaced = sectionHtml.replace(/<img\b[^>]*>/i, (imgTag) => {
            if (!/\bsrc=(['"]).*?\1/i.test(imgTag)) {
              return imgTag;
            }

            replacedInSection += 1;
            return imgTag.replace(
              /\bsrc=(['"]).*?\1/i,
              `src="${preferredImage.fileName}"`
            );
          });

          return replaced;
        }
      );

      if (replacedInSection > 0) {
        return { html: sectionAdjusted, replacedCount: replacedInSection };
      }
    }
  }

  return replaceImgSrcSequentially(html, userImages);
}

export function injectUploadedImagesForPreview(
  html: string,
  userImages: HtmlImageAsset[]
): string {
  let nextHtml = html;

  for (const image of userImages) {
    const variants = [image.fileName, `./${image.fileName}`, `/${image.fileName}`];

    for (const variant of variants) {
      const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      nextHtml = nextHtml.replace(
        new RegExp(`src=[\"']${escapedVariant}[\"']`, "gi"),
        `src="${image.dataUri}"`
      );
    }
  }

  return nextHtml;
}
