"use client";

import type { FieldProps, RJSFSchema } from "@rjsf/utils";
import {
  AudioLinesIcon,
  ImageIcon,
  LinkIcon,
  Loader2Icon,
  RefreshCwIcon,
  SparklesIcon,
  VideoIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AssetExplorerFormContext,
  AssetMediaGenerationResponse,
  MediaFieldSchemaConfig,
  MediaFieldValue,
  MediaGenerationProfile,
} from "@/lib/asset-explorer/media-generation";
import {
  defaultMediaProfile,
  mediaFieldConfigFromSchema,
  mediaFieldDescription,
  mediaFieldLabel,
  mediaFieldSummary,
  mediaFieldValue,
  mediaProfilesForKind,
  mergeMediaFieldValue,
  resolveMediaGenerationDraft,
} from "@/lib/asset-explorer/media-generation";

const IMAGE_SIZE_OPTIONS = ["1024x1024", "1024x1536", "1536x1024"];
const IMAGE_QUALITY_OPTIONS = ["auto", "low", "medium", "high"];

const PROFILE_LABELS: Record<MediaGenerationProfile, string> = {
  character_portrait: "Character Portrait",
  dialogue_voice: "Dialogue Voice",
  item_art: "Item Art",
  item_sfx: "Item SFX",
  promo_clip: "Promo Clip",
  weapon_art: "Weapon Art",
  weapon_sfx: "Weapon SFX",
};

const KIND_META = {
  audio: {
    icon: AudioLinesIcon,
    label: "Audio",
  },
  image: {
    icon: ImageIcon,
    label: "Image",
  },
  video: {
    icon: VideoIcon,
    label: "Video",
  },
} as const;

function statusVariant(status: string): "default" | "outline" | "secondary" {
  if (status === "succeeded" || status === "linked") {
    return "default";
  }
  if (status === "queued" || status === "processing") {
    return "secondary";
  }
  return "outline";
}

type MediaGenerationFieldProps = FieldProps<
  unknown,
  RJSFSchema,
  AssetExplorerFormContext
>;

export function MediaGenerationField(props: MediaGenerationFieldProps) {
  const { formContext, formData, idSchema, name, onChange, schema } = props;
  const config = useMemo(
    () => mediaFieldConfigFromSchema(schema) ?? defaultMediaConfig(schema),
    [schema]
  );
  const resolvedValue = useMemo(
    () => mediaFieldValue(formData, config.kind),
    [config.kind, formData]
  );
  const label = mediaFieldLabel(schema, config);
  const description = mediaFieldDescription(schema, config);
  const rootFormData = formContext?.rootFormData;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<"" | "queue" | "refresh">("");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<MediaGenerationProfile>(
    resolvedValue.profile ??
      config.defaultProfile ??
      defaultMediaProfile(config.kind)
  );
  const [prompt, setPrompt] = useState(resolvedValue.prompt ?? "");
  const [sourceText, setSourceText] = useState(
    resolvedValue.sourceTextOrPrompt ?? ""
  );
  const [voiceId, setVoiceId] = useState(resolvedValue.voiceId ?? "");
  const [model, setModel] = useState(resolvedValue.model ?? "");
  const [size, setSize] = useState(resolvedValue.size ?? "1024x1024");
  const [quality, setQuality] = useState(resolvedValue.quality ?? "auto");
  const [manualUrl, setManualUrl] = useState(resolvedValue.mediaUrl ?? "");

  useEffect(() => {
    const draft = resolveMediaGenerationDraft(config, formData, rootFormData);
    setProfile(
      draft.profile ?? config.defaultProfile ?? defaultMediaProfile(config.kind)
    );
    setPrompt(draft.prompt ?? "");
    setSourceText(draft.sourceTextOrPrompt ?? "");
    setVoiceId(draft.voiceId ?? "");
    setModel(draft.model ?? "");
    setSize(draft.size ?? "1024x1024");
    setQuality(draft.quality ?? "auto");
    setManualUrl(resolvedValue.mediaUrl ?? "");
    setError("");
  }, [config, formData, rootFormData, resolvedValue.mediaUrl]);

  const kindMeta = KIND_META[config.kind];
  const KindIcon = kindMeta.icon;
  const profiles = mediaProfilesForKind(config.kind);
  const requiresPrompt = config.kind === "image";
  const requiresText = config.kind === "audio";
  const requiresVoice = profile === "dialogue_voice";

  async function queueGeneration() {
    try {
      setBusyAction("queue");
      setError("");
      const response = await fetch("/api/ai/generate/asset-media", {
        body: JSON.stringify({
          context: {
            assetId: formContext?.assetId,
            assetName: formContext?.assetName,
            fieldPath: name,
            projectId: formContext?.projectId,
            schemaId: formContext?.schemaId,
          },
          kind: config.kind,
          model: model || undefined,
          profile,
          prompt: prompt || undefined,
          quality: quality || undefined,
          size: size || undefined,
          sourceTextOrPrompt: sourceText || undefined,
          voiceId: voiceId || undefined,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      const body = (await response.json()) as AssetMediaGenerationResponse;
      if (!response.ok || !body.ok || !body.generation) {
        throw new Error(body.error ?? "Failed to queue media generation.");
      }

      onChange(body.generation, [], undefined, idSchema.$id);
      setDialogOpen(false);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to queue media generation."
      );
    } finally {
      setBusyAction("");
    }
  }

  async function refreshGeneration() {
    if (!resolvedValue.generationId) {
      return;
    }

    try {
      setBusyAction("refresh");
      setError("");
      const response = await fetch(
        `/api/ai/generate/asset-media?kind=${encodeURIComponent(config.kind)}&generationId=${resolvedValue.generationId}`,
        {
          cache: "no-store",
        }
      );
      const body = (await response.json()) as AssetMediaGenerationResponse;
      if (!response.ok || !body.ok || !body.generation) {
        throw new Error(body.error ?? "Failed to refresh generation status.");
      }
      onChange(body.generation, [], undefined, idSchema.$id);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to refresh generation status."
      );
    } finally {
      setBusyAction("");
    }
  }

  function applyManualUrl() {
    const trimmedUrl = manualUrl.trim();
    onChange(
      mergeMediaFieldValue(
        formData,
        {
          errorMessage: null,
          mediaUrl: trimmedUrl.length > 0 ? trimmedUrl : null,
          profile,
          status: trimmedUrl.length > 0 ? "linked" : "draft",
          updatedAt: new Date().toISOString(),
        },
        config.kind
      ),
      [],
      undefined,
      idSchema.$id
    );
    setDialogOpen(false);
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <KindIcon className="size-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">{label}</p>
          </div>
          {description ? (
            <p className="max-w-xl text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{kindMeta.label}</Badge>
          <Badge variant="outline">
            {PROFILE_LABELS[profile] ??
              profile ??
              defaultMediaProfile(config.kind)}
          </Badge>
          <Badge variant={statusVariant(resolvedValue.status)}>
            {resolvedValue.status}
          </Badge>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
        {mediaFieldSummary(resolvedValue)}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setDialogOpen(true)}
        >
          <SparklesIcon className="size-4" />
          Open Media Widget
        </Button>
        {resolvedValue.generationId ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busyAction.length > 0}
            onClick={refreshGeneration}
          >
            {busyAction === "refresh" ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-4" />
            )}
            Refresh Status
          </Button>
        ) : null}
        {resolvedValue.mediaUrl ? (
          <Button type="button" size="sm" variant="ghost" asChild>
            <a
              href={resolvedValue.mediaUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <LinkIcon className="size-4" />
              Open Media
            </a>
          </Button>
        ) : null}
      </div>

      {error.length > 0 ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>
              Queue hosted generation or attach an existing media URL to this
              asset field.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="generate" className="space-y-3">
            <TabsList>
              <TabsTrigger value="generate">Generate</TabsTrigger>
              <TabsTrigger value="link">Link Existing</TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <div className="text-[11px] font-medium text-muted-foreground">
                    Profile
                  </div>
                  <select
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                    value={profile}
                    onChange={(event) =>
                      setProfile(event.target.value as MediaGenerationProfile)
                    }
                  >
                    {profiles.map((option) => (
                      <option key={option} value={option}>
                        {PROFILE_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <div className="text-[11px] font-medium text-muted-foreground">
                    Model
                  </div>
                  <Input
                    placeholder={
                      config.kind === "audio"
                        ? "eleven_multilingual_v2"
                        : config.kind === "image"
                          ? "gpt-image-1"
                          : "coming soon"
                    }
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                  />
                </label>
              </div>

              {config.kind === "image" ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1">
                    <div className="text-[11px] font-medium text-muted-foreground">
                      Size
                    </div>
                    <select
                      className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                      value={size}
                      onChange={(event) => setSize(event.target.value)}
                    >
                      {IMAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <div className="text-[11px] font-medium text-muted-foreground">
                      Quality
                    </div>
                    <select
                      className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                      value={quality}
                      onChange={(event) => setQuality(event.target.value)}
                    >
                      {IMAGE_QUALITY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              {requiresPrompt ? (
                <label className="space-y-1">
                  <div className="text-[11px] font-medium text-muted-foreground">
                    Prompt
                  </div>
                  <textarea
                    className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Describe the image generation you want for this asset."
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                  />
                </label>
              ) : null}

              {requiresText ? (
                <label className="space-y-1">
                  <div className="text-[11px] font-medium text-muted-foreground">
                    Source Text / Prompt
                  </div>
                  <textarea
                    className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Voice line text or SFX prompt."
                    value={sourceText}
                    onChange={(event) => setSourceText(event.target.value)}
                  />
                </label>
              ) : null}

              {requiresVoice ? (
                <label className="space-y-1">
                  <div className="text-[11px] font-medium text-muted-foreground">
                    Voice ID
                  </div>
                  <Input
                    placeholder="ElevenLabs voice ID"
                    value={voiceId}
                    onChange={(event) => setVoiceId(event.target.value)}
                  />
                </label>
              ) : null}

              {config.kind === "video" ? (
                <div className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                  Video generation slots are preserved in the schema layer, but
                  the hosted video backend is not wired yet. Use Link Existing
                  for now so the asset can still carry video metadata.
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="link" className="space-y-4">
              <label className="space-y-1">
                <div className="text-[11px] font-medium text-muted-foreground">
                  Existing Media URL
                </div>
                <Input
                  placeholder="https://..."
                  value={manualUrl}
                  onChange={(event) => setManualUrl(event.target.value)}
                />
              </label>
              <div className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                Use this when media already exists outside the generator flow,
                or while video generation is still being wired.
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="outline" onClick={applyManualUrl}>
              Save Linked Media
            </Button>
            <Button
              type="button"
              disabled={
                busyAction.length > 0 ||
                (config.kind === "image" && prompt.trim().length === 0) ||
                (config.kind === "audio" && sourceText.trim().length === 0) ||
                (requiresVoice && voiceId.trim().length === 0) ||
                config.kind === "video"
              }
              onClick={queueGeneration}
            >
              {busyAction === "queue" ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SparklesIcon className="size-4" />
              )}
              Queue Generation
            </Button>
          </DialogFooter>
          <div className="text-[11px] text-muted-foreground">
            Field id: {idSchema.$id}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function defaultMediaConfig(schema: RJSFSchema): MediaFieldSchemaConfig {
  return {
    allowManualUrl: true,
    defaultProfile: "item_art",
    kind: "image",
    label:
      typeof schema.title === "string" && schema.title.length > 0
        ? schema.title
        : "Generated Media",
  };
}
