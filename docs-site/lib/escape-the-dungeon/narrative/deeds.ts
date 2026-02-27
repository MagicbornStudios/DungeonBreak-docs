import type { DeedMemory } from "@/lib/escape-the-dungeon/core/types";
import {
  AnchorProjector,
  EmbeddingStore,
  HashEmbeddingProvider,
  type ProjectionBudget,
} from "@/lib/escape-the-dungeon/narrative/hash-embeddings";

export interface Deed {
  deedId: string;
  actorId: string;
  actorName: string;
  deedType: string;
  title: string;
  summary: string;
  depth: number;
  roomId: string;
  tags: string[];
  turnIndex: number;
}

const TRAIT_ANCHORS: Record<string, string> = {
  Comprehension: "understanding patterns and hidden causes",
  Constraint: "discipline restraint and strict control",
  Construction: "building tools practical structures engineering",
  Direction: "leadership and clear purpose",
  Empathy: "care compassion attentive listening",
  Equilibrium: "balance calm stable judgment",
  Freedom: "independence exploration improvisation",
  Levity: "humor hopeful lightness",
  Projection: "future planning and ambition",
  Survival: "resilience safety and endurance",
};

const FEATURE_ANCHORS: Record<string, string> = {
  Fame: "attention audience reach crowd engagement",
  Effort: "spent stamina sustained work exertion",
  Awareness: "perception noticing details situational awareness",
  Guile: "deception stealth opportunistic manipulation",
  Momentum: "building pace escalating progress rising pressure",
};

export class DeedVectorizer {
  private readonly store: EmbeddingStore;

  private readonly traitProjector: AnchorProjector;

  private readonly featureProjector: AnchorProjector;

  private readonly budget: ProjectionBudget;

  constructor(
    store = new EmbeddingStore(new HashEmbeddingProvider(96)),
    budget: ProjectionBudget = { perFeatureCap: 0.22, globalBudget: 0.35 },
  ) {
    this.store = store;
    this.traitProjector = new AnchorProjector(new HashEmbeddingProvider(96), TRAIT_ANCHORS);
    this.featureProjector = new AnchorProjector(new HashEmbeddingProvider(96), FEATURE_ANCHORS);
    this.budget = budget;
  }

  canonicalText(deed: Deed): string {
    const orderedTags = [...deed.tags].sort((a, b) => a.localeCompare(b));
    return [
      `deed_id:${deed.deedId}`,
      `actor:${deed.actorId}`,
      `actor_name:${deed.actorName}`,
      `type:${deed.deedType}`,
      `title:${deed.title}`,
      `summary:${deed.summary}`,
      `depth:${deed.depth}`,
      `room:${deed.roomId}`,
      `turn:${deed.turnIndex}`,
      `tags:${orderedTags.join("|")}`,
    ].join("\n");
  }

  vectorize(deed: Deed): DeedMemory {
    const record = this.store.embedCanonical("deed", deed.deedId, this.canonicalText(deed));
    const traitProjection = this.traitProjector.projectVector(record.vector, 0.2, this.budget);
    const featureProjection = this.featureProjector.projectVector(record.vector, 0.2, this.budget);
    return {
      deedId: deed.deedId,
      summary: deed.summary,
      sourceAction: deed.deedType,
      turnIndex: deed.turnIndex,
      depth: deed.depth,
      roomId: deed.roomId,
      tags: [...deed.tags],
      traitDelta: traitProjection.finalDeltas,
      featureDelta: featureProjection.finalDeltas,
      vector: [...record.vector],
    };
  }

  projectIntent(intentText: string): { traitDelta: Record<string, number>; featureDelta: Record<string, number> } {
    const vector = this.store.embedCanonical("intent", intentText, intentText).vector;
    const traitProjection = this.traitProjector.projectVector(vector, 0.18, this.budget);
    const featureProjection = this.featureProjector.projectVector(vector, 0.12, this.budget);
    return {
      traitDelta: traitProjection.finalDeltas,
      featureDelta: featureProjection.finalDeltas,
    };
  }

  cacheSize(): number {
    return this.store.size();
  }
}
