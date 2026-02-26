"use client";

import { Button, toast, useDocumentInfo } from "@payloadcms/ui";
import { useMemo, useState } from "react";
import { LiveWaveform } from "@/components/ui/live-waveform";

type AudioSourceType = "dialogueLine" | "item" | "weapon";

const AUDIO_SOURCE_BY_COLLECTION: Record<string, AudioSourceType> = {
  "dialogue-lines": "dialogueLine",
  items: "item",
  weapons: "weapon",
};

export function GenerateAudioButton() {
  const { collectionSlug, id } = useDocumentInfo();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sourceType = useMemo(() => {
    return collectionSlug ? AUDIO_SOURCE_BY_COLLECTION[collectionSlug] : undefined;
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
      toast.error("Save this document first before generating audio.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/ai/generate/audio", {
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
        `Audio ${json.status === "processing" ? "already" : "now"} queued (generation #${json.generationId}).`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to queue audio generation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Button buttonStyle="secondary" disabled={disabled} onClick={onGenerate} size="small">
        {isSubmitting ? "Queueing Audio..." : "Generate Audio"}
      </Button>
      <LiveWaveform active={isSubmitting} />
      {!sourceType && (
        <span style={{ color: "var(--theme-elevation-500)", fontSize: "12px" }}>
          Audio generation is available on dialogue lines, weapons, and items.
        </span>
      )}
    </div>
  );
}
