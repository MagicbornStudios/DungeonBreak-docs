"use client";

import { Button, toast, useDocumentInfo } from "@payloadcms/ui";
import { useMemo, useState } from "react";

type ImageSourceType = "character" | "item" | "weapon";

const IMAGE_SOURCE_BY_COLLECTION: Record<string, ImageSourceType> = {
  characters: "character",
  items: "item",
  weapons: "weapon",
};

export function GenerateImageButton() {
  const { collectionSlug, id } = useDocumentInfo();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sourceType = useMemo(() => {
    return collectionSlug ? IMAGE_SOURCE_BY_COLLECTION[collectionSlug] : undefined;
  }, [collectionSlug]);

  const sourceId = useMemo(() => {
    if (typeof id === "number") {
      return id;
    }
    if (typeof id === "string") {
      const parsed = Number(id);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }, [id]);

  const disabled = isSubmitting || !sourceType || sourceId === null;

  async function onGenerate() {
    if (!sourceType || sourceId === null) {
      toast.error("Save this document first before generating an image.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/ai/generate/image", {
        body: JSON.stringify({ sourceId, sourceType }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      const json = (await response.json()) as {
        error?: string;
        generationId?: number;
        status?: string;
      };

      if (!response.ok) {
        throw new Error(json.error || `Request failed (${response.status}).`);
      }

      toast.success(
        `Image ${json.status === "processing" ? "already" : "now"} queued (generation #${json.generationId}).`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to queue image generation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Button buttonStyle="secondary" disabled={disabled} onClick={onGenerate} size="small">
        {isSubmitting ? "Queueing Image..." : "Generate Image"}
      </Button>
      {!sourceType && (
        <span style={{ color: "var(--theme-elevation-500)", fontSize: "12px" }}>
          Image generation is available on characters, weapons, and items.
        </span>
      )}
    </div>
  );
}
