import { clamp } from "../core/types";

export interface EmbeddingRecord {
  sourceType: string;
  sourceId: string;
  canonicalText: string;
  textHash: string;
  modelName: string;
  modelVersion: string;
  dimension: number;
  vector: number[];
}

export const normalizeText = (value: string): string => {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
};

export const simpleHash = (value: string): string => {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h1 ^= value.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return (h1 >>> 0).toString(16).padStart(8, "0");
};

const hashTokenVector = (token: string, dimension: number): number[] => {
  const seed = simpleHash(token);
  const values: number[] = [];
  let rolling = Number.parseInt(seed, 16) || 1;
  for (let i = 0; i < dimension; i += 1) {
    rolling ^= rolling << 13;
    rolling ^= rolling >>> 17;
    rolling ^= rolling << 5;
    const unsigned = rolling >>> 0;
    values.push((unsigned / 0xffffffff) * 2 - 1);
  }
  return values;
};

const unit = (values: number[]): number[] => {
  let total = 0;
  for (const value of values) {
    total += value * value;
  }
  const norm = Math.sqrt(total);
  if (norm < 1e-12) {
    return values.map(() => 0);
  }
  return values.map((value) => value / norm);
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  const len = Math.min(a.length, b.length);
  if (len === 0) {
    return 0;
  }
  let total = 0;
  let aSq = 0;
  let bSq = 0;
  for (let i = 0; i < len; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    total += av * bv;
    aSq += av * av;
    bSq += bv * bv;
  }
  if (aSq < 1e-12 || bSq < 1e-12) {
    return 0;
  }
  return total / (Math.sqrt(aSq) * Math.sqrt(bSq));
};

export class HashEmbeddingProvider {
  readonly dimension: number;

  constructor(dimension = 96) {
    this.dimension = dimension;
  }

  modelName(): string {
    return "hash-token-embedding";
  }

  modelVersion(): string {
    return "1";
  }

  encode(text: string): number[] {
    const normalized = normalizeText(text);
    const tokens = normalized.match(/[A-Za-z0-9_']+/g) ?? [];
    if (tokens.length === 0) {
      return Array.from({ length: this.dimension }, () => 0);
    }
    const aggregate = Array.from({ length: this.dimension }, () => 0);
    for (const token of tokens) {
      const tokenVector = hashTokenVector(token, this.dimension);
      for (let i = 0; i < this.dimension; i += 1) {
        aggregate[i] = (aggregate[i] ?? 0) + (tokenVector[i] ?? 0);
      }
    }
    return unit(aggregate);
  }
}

export class EmbeddingStore {
  private readonly provider: HashEmbeddingProvider;

  private readonly records = new Map<string, EmbeddingRecord>();

  constructor(provider = new HashEmbeddingProvider()) {
    this.provider = provider;
  }

  embedCanonical(sourceType: string, sourceId: string, canonicalText: string): EmbeddingRecord {
    const normalized = normalizeText(canonicalText);
    const textHash = simpleHash(normalized);
    const key = `${sourceType}:${sourceId}:${textHash}:${this.provider.modelName()}:${this.provider.modelVersion()}`;
    const cached = this.records.get(key);
    if (cached) {
      return cached;
    }
    const vector = this.provider.encode(normalized);
    const record: EmbeddingRecord = {
      sourceType,
      sourceId,
      canonicalText: normalized,
      textHash,
      modelName: this.provider.modelName(),
      modelVersion: this.provider.modelVersion(),
      dimension: this.provider.dimension,
      vector,
    };
    this.records.set(key, record);
    return record;
  }

  size(): number {
    return this.records.size;
  }
}

export interface ProjectionBudget {
  perFeatureCap: number;
  globalBudget: number;
}

export interface ProjectionResult {
  rawDeltas: Record<string, number>;
  cappedDeltas: Record<string, number>;
  finalDeltas: Record<string, number>;
  scaleFactor: number;
  similarities: Record<string, number>;
}

export class AnchorProjector {
  private readonly provider: HashEmbeddingProvider;

  private readonly anchorVectors: Record<string, number[]>;

  constructor(provider: HashEmbeddingProvider, anchors: Record<string, string>) {
    this.provider = provider;
    this.anchorVectors = {};
    for (const [name, prompt] of Object.entries(anchors)) {
      this.anchorVectors[name] = this.provider.encode(prompt);
    }
  }

  projectVector(
    vector: number[],
    magnitude = 0.2,
    budget: ProjectionBudget = { perFeatureCap: 0.2, globalBudget: 0.35 },
  ): ProjectionResult {
    const query = unit(vector);
    const raw: Record<string, number> = {};
    const capped: Record<string, number> = {};
    const similarities: Record<string, number> = {};

    for (const [name, anchor] of Object.entries(this.anchorVectors)) {
      const similarity = cosineSimilarity(query, anchor);
      similarities[name] = similarity;
      raw[name] = similarity * magnitude;
      capped[name] = clamp(raw[name] ?? 0, -budget.perFeatureCap, budget.perFeatureCap);
    }

    let totalAbs = 0;
    for (const value of Object.values(capped)) {
      totalAbs += Math.abs(value);
    }
    const scale = totalAbs > budget.globalBudget ? budget.globalBudget / totalAbs : 1;

    const finalDeltas: Record<string, number> = {};
    for (const [name, value] of Object.entries(capped)) {
      finalDeltas[name] = value * scale;
    }

    return {
      rawDeltas: raw,
      cappedDeltas: capped,
      finalDeltas,
      scaleFactor: scale,
      similarities,
    };
  }

  projectText(text: string, magnitude = 0.2, budget?: ProjectionBudget): ProjectionResult {
    return this.projectVector(this.provider.encode(text), magnitude, budget);
  }
}
