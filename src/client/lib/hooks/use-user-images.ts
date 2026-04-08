"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserImage } from "@/shared/types/database";

type UserImagesApiResponse = {
  images?: UserImage[];
  error?: string;
};

type UploadImageApiResponse = {
  fileId?: string;
  fileName?: string;
  dataUri?: string;
  mimeType?: string;
  error?: string;
};

function parseMimeTypeFromDataUri(dataUri: string): string | null {
  const match = dataUri.match(/^data:([^;,]+)[;,]/i);
  return match?.[1]?.trim() ?? null;
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function useUserImages(
  chatId: string | undefined,
  options?: { autoLoad?: boolean }
) {
  const [images, setImages] = useState<UserImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoLoad = options?.autoLoad ?? true;

  useEffect(() => {
    if (!chatId) {
      setImages([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!autoLoad) {
      setImages([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const resolvedChatId = chatId;
    const controller = new AbortController();
    let isDisposed = false;

    async function loadImagesForChat(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/website/user-images?chatId=${encodeURIComponent(resolvedChatId)}`,
          {
            method: "GET",
            signal: controller.signal,
          }
        );

        const data = (await response.json()) as UserImagesApiResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load uploaded images.");
        }

        if (!isDisposed) {
          setImages(Array.isArray(data.images) ? data.images : []);
        }
      } catch (caughtError) {
        if (controller.signal.aborted || isDisposed) {
          return;
        }

        const message = toErrorMessage(caughtError, "Failed to load uploaded images.");
        setError(message);
        setImages([]);
      } finally {
        if (!isDisposed) {
          setIsLoading(false);
        }
      }
    }

    void loadImagesForChat();

    return () => {
      isDisposed = true;
      controller.abort();
    };
  }, [autoLoad, chatId]);

  const uploadImage = useCallback(
    async (
      file: File,
      options?: { chatIdOverride?: string }
    ): Promise<UserImage> => {
      const resolvedChatId =
        options?.chatIdOverride?.trim() || chatId?.trim() || "";

      if (!resolvedChatId) {
        throw new Error("Sign in to upload images.");
      }

      const formData = new FormData();
      formData.append("chatId", resolvedChatId);
      formData.append("file", file);

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/website/upload-image", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as UploadImageApiResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to upload image.");
        }

        if (
          typeof data.fileId !== "string" ||
          typeof data.fileName !== "string" ||
          typeof data.dataUri !== "string"
        ) {
          throw new Error("Upload response was missing image data.");
        }

        const resolvedMimeType =
          data.mimeType ??
          parseMimeTypeFromDataUri(data.dataUri) ??
          (file.type && file.type.startsWith("image/") ? file.type : "image/*");

        const uploaded: UserImage = {
          fileId: data.fileId,
          fileName: data.fileName,
          dataUri: data.dataUri,
          mimeType: resolvedMimeType,
        };

        setImages((previous) => [...previous, uploaded]);
        return uploaded;
      } catch (caughtError) {
        const message = toErrorMessage(caughtError, "Failed to upload image.");
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [chatId]
  );

  const deleteImage = useCallback(
    async (fileId: string): Promise<void> => {
      if (!fileId) {
        return;
      }

      const previousImages = images;
      setIsLoading(true);
      setError(null);
      setImages((current) => current.filter((image) => image.fileId !== fileId));

      try {
        const response = await fetch(
          `/api/website/upload-image?fileId=${encodeURIComponent(fileId)}`,
          {
            method: "DELETE",
          }
        );

        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to delete image.");
        }
      } catch (caughtError) {
        setImages(previousImages);
        const message = toErrorMessage(caughtError, "Failed to delete image.");
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [images]
  );

  const clearImages = useCallback(() => {
    setError(null);
    setImages([]);
  }, []);

  return {
    images,
    isLoading,
    error,
    uploadImage,
    deleteImage,
    clearImages,
  };
}
