"use client";

import { useDocumentInfo } from "@payloadcms/ui";
import { useEffect, useMemo, useState } from "react";
import { AudioPlayer } from "@/components/ui/audio-player";

type RelationConfig = {
  relationCollection: "audio-assets" | "media";
  relationField: string;
};

const COLLECTION_TO_RELATION: Record<string, RelationConfig> = {
  "audio-assets": {
    relationCollection: "media",
    relationField: "media",
  },
  "dialogue-lines": {
    relationCollection: "audio-assets",
    relationField: "latestAudioAsset",
  },
  items: {
    relationCollection: "audio-assets",
    relationField: "latestAudioAsset",
  },
  weapons: {
    relationCollection: "audio-assets",
    relationField: "latestAudioAsset",
  },
};

function relationId(value: unknown): null | number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value !== null && typeof value === "object") {
    const maybeID = (value as Record<string, unknown>).id;
    return relationId(maybeID);
  }
  return null;
}

function getMediaUrlFromDoc(doc: unknown): null | string {
  if (!doc || typeof doc !== "object") {
    return null;
  }

  const docRecord = doc as Record<string, unknown>;
  if (typeof docRecord.url === "string" && docRecord.url.trim().length > 0) {
    return docRecord.url;
  }

  const media = docRecord.media;
  if (media && typeof media === "object") {
    const mediaUrl = (media as Record<string, unknown>).url;
    if (typeof mediaUrl === "string" && mediaUrl.trim().length > 0) {
      return mediaUrl;
    }
  }

  return null;
}

async function fetchCollectionDoc(
  collection: "audio-assets" | "media",
  id: number,
  depth = 1
): Promise<unknown> {
  const response = await fetch(`/api/${collection}/${id}?depth=${depth}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${collection}#${id} (${response.status}).`);
  }

  return response.json();
}

export function AudioPreviewField() {
  const { collectionSlug, data } = useDocumentInfo();
  const [audioUrl, setAudioUrl] = useState<null | string>(null);
  const [error, setError] = useState<null | string>(null);
  const [isLoading, setIsLoading] = useState(false);

  const relationConfig = useMemo(() => {
    if (!collectionSlug) {
      return null;
    }
    return COLLECTION_TO_RELATION[collectionSlug] || null;
  }, [collectionSlug]);

  const sourceRelationId = useMemo(() => {
    if (!relationConfig || !data || typeof data !== "object") {
      return null;
    }

    const record = data as Record<string, unknown>;
    return relationId(record[relationConfig.relationField]);
  }, [data, relationConfig]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!relationConfig || sourceRelationId === null) {
        setAudioUrl(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const doc = await fetchCollectionDoc(
          relationConfig.relationCollection,
          sourceRelationId,
          relationConfig.relationCollection === "audio-assets" ? 2 : 0
        );

        let resolvedUrl = getMediaUrlFromDoc(doc);

        if (!resolvedUrl && relationConfig.relationCollection === "audio-assets") {
          const mediaId = relationId((doc as Record<string, unknown>).media);
          if (mediaId !== null) {
            const mediaDoc = await fetchCollectionDoc("media", mediaId, 0);
            resolvedUrl = getMediaUrlFromDoc(mediaDoc);
          }
        }

        if (!cancelled) {
          setAudioUrl(resolvedUrl || null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setAudioUrl(null);
          setError(loadError instanceof Error ? loadError.message : "Failed to load audio preview.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [relationConfig, sourceRelationId]);

  if (isLoading) {
    return <div style={{ color: "var(--theme-elevation-500)", fontSize: 12 }}>Loading audio preview...</div>;
  }

  if (error) {
    return <div style={{ color: "#b91c1c", fontSize: 12 }}>{error}</div>;
  }

  return <AudioPlayer src={audioUrl} title="Generated audio preview" />;
}
