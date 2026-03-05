"use client";

import { useEffect, useState } from "react";

type RuntimeModelSchemaRow = {
  modelId: string;
  label: string;
  description?: string;
};

type ModelInstanceBinding = {
  id: string;
  name: string;
  modelId: string;
  canonical: boolean;
};

export function useContentCreatorDrafts(
  panelModelSchema: RuntimeModelSchemaRow | null,
  panelModelInstance: ModelInstanceBinding | null,
) {
  const [modelLabelDraft, setModelLabelDraft] = useState("");
  const [modelDescriptionDraft, setModelDescriptionDraft] = useState("");
  const [canonicalNameDraft, setCanonicalNameDraft] = useState("");

  useEffect(() => {
    if (!panelModelSchema) {
      setModelLabelDraft("");
      setModelDescriptionDraft("");
      return;
    }
    setModelLabelDraft(panelModelSchema.label ?? panelModelSchema.modelId);
    setModelDescriptionDraft(panelModelSchema.description ?? "");
  }, [panelModelSchema]);

  useEffect(() => {
    if (!panelModelInstance?.canonical) {
      setCanonicalNameDraft("");
      return;
    }
    setCanonicalNameDraft(panelModelInstance.name);
  }, [panelModelInstance]);

  return {
    modelLabelDraft,
    modelDescriptionDraft,
    canonicalNameDraft,
    setModelLabelDraft,
    setModelDescriptionDraft,
    setCanonicalNameDraft,
  };
}
