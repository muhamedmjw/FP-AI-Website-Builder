export async function compressImage(file: File, options = { maxWidth: 1024, maxHeight: 1024, quality: 0.8 }): Promise<File> {
  // If it's not a common image format, return as is (e.g. svg, gif)
  if (!file.type.startsWith("image/jpeg") && !file.type.startsWith("image/png") && !file.type.startsWith("image/webp")) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio and dimensions
        if (width > options.maxWidth || height > options.maxHeight) {
          if (width > height) {
            height = Math.round((height * options.maxWidth) / width);
            width = options.maxWidth;
          } else {
            width = Math.round((width * options.maxHeight) / height);
            height = options.maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas back to a Blob/File
        // Always compress to WebP for maximum space savings, or stick to origin format if preferred
        const mimeType = "image/webp"; 

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            
            // Reconstruct file object
            const extension = "webp";
            const newName = file.name.replace(/\.[^/.]+$/, "") + "." + extension;
            const compressedFile = new File([blob], newName, { type: mimeType, lastModified: Date.now() });
            
            resolve(compressedFile);
          },
          mimeType,
          options.quality
        );
      };

      img.onerror = () => resolve(file); // fallback
      
      if (typeof event.target?.result === "string") {
        img.src = event.target.result;
      } else {
        resolve(file);
      }
    };

    reader.onerror = () => resolve(file); // fallback
    reader.readAsDataURL(file);
  });
}
