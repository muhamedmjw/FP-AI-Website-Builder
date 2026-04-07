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
  error?: string;
};

export function useUserImages(chatId: string | undefined) {
  const [images, setImages] = useState<UserImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    if (!chatId) {
      setImages([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/website/user-images?chatId=${encodeURIComponent(chatId)}`,
        { method: "GET" }
      );

      const data = (await response.json()) as UserImagesApiResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load uploaded images.");
      }

      setImages(Array.isArray(data.images) ? data.images : []);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to load uploaded images.";
      setError(message);
      setImages([]);
      console.error("useUserImages load failed:", message);
    } finally {
      setIsLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  const uploadImage = useCallback(
    async (file: File): Promise<UserImage> => {
      if (!chatId) {
        throw new Error("Sign in to upload images.");
      }

      const formData = new FormData();
      formData.append("chatId", chatId);
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

        const mimeType = file.type && file.type.startsWith("image/")
          ? file.type
          : "image/*";

        const uploaded: UserImage = {
          fileId: data.fileId,
          fileName: data.fileName,
          dataUri: data.dataUri,
          mimeType,
        };

        setImages((previous) => [...previous, uploaded]);
        return uploaded;
      } finally {
        setIsLoading(false);
      }
    },
    [chatId]
  );

  const deleteImage = useCallback(async (fileId: string) => {
    if (!fileId) {
      return;
    }

    const previousImages = images;
    setImages((existing) => existing.filter((image) => image.fileId !== fileId));
      setError(null);

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
    } catch (error) {
      setImages(previousImages);
      throw error;
    }
  }, [images]);

  return {
    images,
    isLoading,
    error,
    uploadImage,
    deleteImage,
  };
}
