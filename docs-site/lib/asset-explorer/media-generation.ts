import type { RJSFSchema, UiSchema } from "@rjsf/utils";

export type MediaKind = "audio" | "image" | "video";

export type MediaGenerationProfile =
  | "character_portrait"
  | "dialogue_voice"
  | "item_art"
  | "item_sfx"
  | "promo_clip"
  | "weapon_art"
  | "weapon_sfx";

export type MediaFieldSchemaConfig = {
  allowManualUrl?: boolean;
  defaultProfile?: MediaGenerationProfile;
  description?: string;
  kind: MediaKind;
  label?: string;
  modelField?: string;
  promptField?: string;
  qualityField?: string;
  sizeField?: string;
  textField?: string;
  voiceIdField?: string;
};

export type MediaFieldValue = {
  errorMessage: null | string;
  generationCollection: "audio-assets" | "image-assets" | "media" | null;
  generationId: null | number;
  kind: MediaKind;
  mediaId: null | number;
  mediaUrl: null | string;
  model: null | string;
  profile: null | MediaGenerationProfile;
  prompt: null | string;
  provider: null | string;
  quality: null | string;
  size: null | string;
  sourceTextOrPrompt: null | string;
  status: string;
  updatedAt: null | string;
  voiceId: null | string;
};

export type AssetExplorerFormContext = {
  assetId?: string;
  assetName?: string;
  projectId?: string;
  rootFormData?: unknown;
  schemaId?: string;
};

export type AssetMediaGenerationContext = {
  assetId?: string;
  assetName?: string;
  fieldPath?: string;
  projectId?: string;
  schemaId?: string;
};

export type AssetMediaGenerationRequest = {
  context?: AssetMediaGenerationContext;
  kind: MediaKind;
  model?: string;
  profile?: MediaGenerationProfile;
  prompt?: string;
  quality?: string;
  size?: string;
  sourceTextOrPrompt?: string;
  voiceId?: string;
};

export type AssetMediaGenerationResponse = {
  error?: string;
  generation?: MediaFieldValue;
  note?: string;
  ok: boolean;
};

const IMAGE_PROFILES = [
  "character_portrait",
  "weapon_art",
  "item_art",
] as const satisfies MediaGenerationProfile[];
const AUDIO_PROFILES = [
  "dialogue_voice",
  "weapon_sfx",
  "item_sfx",
] as const satisfies MediaGenerationProfile[];
const VIDEO_PROFILES = [
  "promo_clip",
] as const satisfies MediaGenerationProfile[];

const DEFAULT_PROFILE_BY_KIND: Record<MediaKind, MediaGenerationProfile> = {
  audio: "item_sfx",
  image: "item_art",
  video: "promo_clip",
};

const MEDIA_GENERATION_FIELD_KEY = "x-dungeonbreak-media";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asOptionalString(value: unknown): null | string {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalNumber(value: unknown): null | number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asProfile(
  kind: MediaKind,
  value: unknown
): MediaGenerationProfile | null {
  if (typeof value !== "string") {
    return null;
  }
  const profiles = mediaProfilesForKind(kind);
  return profiles.includes(value as MediaGenerationProfile)
    ? (value as MediaGenerationProfile)
    : null;
}

function nestedUiSchema(
  value: UiSchema | undefined,
  key: string
): UiSchema | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const nestedValue = value[key as keyof typeof value];
  return nestedValue && typeof nestedValue === "object"
    ? (nestedValue as UiSchema)
    : undefined;
}

export function mediaProfilesForKind(
  kind: MediaKind
): MediaGenerationProfile[] {
  if (kind === "image") {
    return [...IMAGE_PROFILES];
  }
  if (kind === "audio") {
    return [...AUDIO_PROFILES];
  }
  return [...VIDEO_PROFILES];
}

export function defaultMediaProfile(kind: MediaKind): MediaGenerationProfile {
  return DEFAULT_PROFILE_BY_KIND[kind];
}

export function mediaFieldConfigFromSchema(
  schema: RJSFSchema | null | undefined
): MediaFieldSchemaConfig | null {
  if (!schema || !isRecord(schema)) {
    return null;
  }
  const rawConfig = schema[MEDIA_GENERATION_FIELD_KEY];
  if (!isRecord(rawConfig)) {
    return null;
  }
  const kind = rawConfig.kind;
  if (kind !== "audio" && kind !== "image" && kind !== "video") {
    return null;
  }
  return {
    allowManualUrl: rawConfig.allowManualUrl !== false,
    defaultProfile:
      asProfile(kind, rawConfig.defaultProfile) ?? defaultMediaProfile(kind),
    description: asOptionalString(rawConfig.description) ?? undefined,
    kind,
    label: asOptionalString(rawConfig.label) ?? undefined,
    modelField: asOptionalString(rawConfig.modelField) ?? undefined,
    promptField: asOptionalString(rawConfig.promptField) ?? undefined,
    qualityField: asOptionalString(rawConfig.qualityField) ?? undefined,
    sizeField: asOptionalString(rawConfig.sizeField) ?? undefined,
    textField: asOptionalString(rawConfig.textField) ?? undefined,
    voiceIdField: asOptionalString(rawConfig.voiceIdField) ?? undefined,
  };
}

export function buildAssetExplorerUiSchema(
  schema: RJSFSchema | null | undefined
): UiSchema | undefined {
  if (!schema || !isRecord(schema)) {
    return undefined;
  }

  const mediaConfig = mediaFieldConfigFromSchema(schema);
  if (mediaConfig) {
    return {
      "ui:field": "dungeonbreakMediaField",
      "ui:options": {
        mediaConfig,
      },
    };
  }

  const schemaType = schema.type;
  if (schemaType === "object" && isRecord(schema.properties)) {
    const nextUiSchema: UiSchema = {};
    let hasNestedConfig = false;
    for (const [key, propertySchema] of Object.entries(schema.properties)) {
      const nested = buildAssetExplorerUiSchema(
        propertySchema as RJSFSchema | undefined
      );
      if (nested) {
        nextUiSchema[key] = nested;
        hasNestedConfig = true;
      }
    }
    return hasNestedConfig ? nextUiSchema : undefined;
  }

  if (schemaType === "array" && schema.items) {
    const nested = buildAssetExplorerUiSchema(schema.items as RJSFSchema);
    return nested ? { items: nested } : undefined;
  }

  return undefined;
}

export function mediaFieldConfigAtPath(
  schema: RJSFSchema | null | undefined,
  path: string
): MediaFieldSchemaConfig | null {
  if (!schema || path.trim().length === 0) {
    return null;
  }
  const segments = path.split(".");
  let cursor: RJSFSchema | undefined | null = schema;
  for (const segment of segments) {
    if (!cursor || !isRecord(cursor)) {
      return null;
    }
    if (cursor.type === "object" && isRecord(cursor.properties)) {
      cursor = cursor.properties[segment] as RJSFSchema | undefined;
      continue;
    }
    if (cursor.type === "array" && segment === "items") {
      cursor = cursor.items as RJSFSchema | undefined;
      continue;
    }
    return null;
  }
  return mediaFieldConfigFromSchema(cursor);
}

export function getValueAtPath(root: unknown, path: string): unknown {
  if (path.trim().length === 0) {
    return root;
  }
  let cursor: unknown = root;
  for (const segment of path.split(".")) {
    if (!isRecord(cursor)) {
      return undefined;
    }
    cursor = cursor[segment];
  }
  return cursor;
}

export function getStringAtPath(root: unknown, path: string): null | string {
  return asOptionalString(getValueAtPath(root, path));
}

export function mediaFieldValue(
  value: unknown,
  kind: MediaKind
): MediaFieldValue {
  if (typeof value === "string") {
    return {
      errorMessage: null,
      generationCollection: null,
      generationId: null,
      kind,
      mediaId: null,
      mediaUrl: value,
      model: null,
      profile: defaultMediaProfile(kind),
      prompt: null,
      provider: null,
      quality: null,
      size: null,
      sourceTextOrPrompt: null,
      status: "linked",
      updatedAt: null,
      voiceId: null,
    };
  }

  const record = isRecord(value) ? value : {};
  return {
    errorMessage: asOptionalString(record.errorMessage),
    generationCollection:
      record.generationCollection === "audio-assets" ||
      record.generationCollection === "image-assets" ||
      record.generationCollection === "media"
        ? record.generationCollection
        : null,
    generationId: asOptionalNumber(record.generationId),
    kind,
    mediaId: asOptionalNumber(record.mediaId),
    mediaUrl: asOptionalString(record.mediaUrl),
    model: asOptionalString(record.model),
    profile: asProfile(kind, record.profile) ?? defaultMediaProfile(kind),
    prompt: asOptionalString(record.prompt),
    provider: asOptionalString(record.provider),
    quality: asOptionalString(record.quality),
    size: asOptionalString(record.size),
    sourceTextOrPrompt: asOptionalString(record.sourceTextOrPrompt),
    status: asOptionalString(record.status) ?? "draft",
    updatedAt: asOptionalString(record.updatedAt),
    voiceId: asOptionalString(record.voiceId),
  };
}

export function mergeMediaFieldValue(
  currentValue: unknown,
  nextValue: Partial<MediaFieldValue>,
  kind: MediaKind
): MediaFieldValue {
  return {
    ...mediaFieldValue(currentValue, kind),
    ...nextValue,
    kind,
  };
}

export function mediaFieldLabel(
  schema: RJSFSchema | null | undefined,
  config: MediaFieldSchemaConfig
): string {
  if (config.label) {
    return config.label;
  }
  if (
    schema &&
    typeof schema.title === "string" &&
    schema.title.trim().length > 0
  ) {
    return schema.title;
  }
  if (config.kind === "image") {
    return "Generated Image";
  }
  if (config.kind === "audio") {
    return "Generated Audio";
  }
  return "Generated Video";
}

export function mediaFieldDescription(
  schema: RJSFSchema | null | undefined,
  config: MediaFieldSchemaConfig
): null | string {
  if (config.description) {
    return config.description;
  }
  if (
    schema &&
    typeof schema.description === "string" &&
    schema.description.trim().length > 0
  ) {
    return schema.description;
  }
  if (config.kind === "video") {
    return "Video slots are part of the asset model, but hosted generation is not wired yet.";
  }
  return null;
}

export function resolveMediaGenerationDraft(
  config: MediaFieldSchemaConfig,
  currentValue: unknown,
  rootFormData: unknown
): Pick<
  MediaFieldValue,
  | "model"
  | "profile"
  | "prompt"
  | "quality"
  | "size"
  | "sourceTextOrPrompt"
  | "voiceId"
> {
  const current = mediaFieldValue(currentValue, config.kind);
  return {
    model:
      (config.modelField
        ? getStringAtPath(rootFormData, config.modelField)
        : null) ?? current.model,
    profile:
      asProfile(
        config.kind,
        isRecord(currentValue) ? currentValue.profile : null
      ) ??
      config.defaultProfile ??
      current.profile ??
      defaultMediaProfile(config.kind),
    prompt:
      (config.promptField
        ? getStringAtPath(rootFormData, config.promptField)
        : null) ?? current.prompt,
    quality:
      (config.qualityField
        ? getStringAtPath(rootFormData, config.qualityField)
        : null) ?? current.quality,
    size:
      (config.sizeField
        ? getStringAtPath(rootFormData, config.sizeField)
        : null) ?? current.size,
    sourceTextOrPrompt:
      (config.textField
        ? getStringAtPath(rootFormData, config.textField)
        : null) ?? current.sourceTextOrPrompt,
    voiceId:
      (config.voiceIdField
        ? getStringAtPath(rootFormData, config.voiceIdField)
        : null) ?? current.voiceId,
  };
}

export function buildMediaGenerationRequest(
  config: MediaFieldSchemaConfig,
  currentValue: unknown,
  rootFormData: unknown,
  context: AssetMediaGenerationContext
): AssetMediaGenerationRequest {
  const draft = resolveMediaGenerationDraft(config, currentValue, rootFormData);
  return {
    context,
    kind: config.kind,
    model: draft.model ?? undefined,
    profile: draft.profile ?? undefined,
    prompt: draft.prompt ?? undefined,
    quality: draft.quality ?? undefined,
    size: draft.size ?? undefined,
    sourceTextOrPrompt: draft.sourceTextOrPrompt ?? undefined,
    voiceId: draft.voiceId ?? undefined,
  };
}

export function mediaFieldSummary(value: MediaFieldValue): string {
  if (value.mediaUrl) {
    return value.mediaUrl;
  }
  if (value.prompt) {
    return value.prompt;
  }
  if (value.sourceTextOrPrompt) {
    return value.sourceTextOrPrompt;
  }
  return "No media attached yet.";
}

export function mediaConfigFromUiSchema(
  uiSchema: UiSchema | undefined,
  path: string
): MediaFieldSchemaConfig | null {
  if (!uiSchema) {
    return null;
  }
  let cursor = uiSchema;
  for (const segment of path.split(".")) {
    const nested = nestedUiSchema(cursor, segment);
    if (!nested) {
      return null;
    }
    cursor = nested;
  }
  const optionsValue = cursor["ui:options" as keyof typeof cursor];
  if (!optionsValue || typeof optionsValue !== "object") {
    return null;
  }
  const configValue = (optionsValue as JsonRecord).mediaConfig;
  if (!configValue || typeof configValue !== "object") {
    return null;
  }
  const kind = (configValue as JsonRecord).kind;
  if (kind !== "audio" && kind !== "image" && kind !== "video") {
    return null;
  }
  return configValue as MediaFieldSchemaConfig;
}
