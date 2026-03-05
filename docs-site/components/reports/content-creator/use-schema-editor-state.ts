"use client";

import { useDeferredValue, useEffect, useState } from "react";

type JsonSectionKey = "models" | "stats" | "canonical";
type JsonSectionMode = "preview" | "edit";

type UseSchemaEditorStateParams = {
  modelsSchemaJson: string;
  statsSchemaJson: string;
  canonicalSchemaJson: string;
  activeNavigatorMode: "tree" | "json";
  objectSectionTab: "models" | "canonical";
};

export function useSchemaEditorState({
  modelsSchemaJson,
  statsSchemaJson,
  canonicalSchemaJson,
  activeNavigatorMode,
  objectSectionTab,
}: UseSchemaEditorStateParams) {
  const [jsonSyntaxMounted, setJsonSyntaxMounted] = useState(false);
  const [jsonSectionOpen, setJsonSectionOpen] = useState<Record<JsonSectionKey, boolean>>({
    models: false,
    stats: false,
    canonical: false,
  });
  const [jsonSectionEditorMode, setJsonSectionEditorMode] = useState<Record<JsonSectionKey, JsonSectionMode>>({
    models: "preview",
    stats: "preview",
    canonical: "preview",
  });
  const [modelsSchemaDraft, setModelsSchemaDraft] = useState("");
  const [statsSchemaDraft, setStatsSchemaDraft] = useState("");
  const [canonicalSchemaDraft, setCanonicalSchemaDraft] = useState("");
  const [jsonApplyError, setJsonApplyError] = useState("");

  const deferredModelsSchemaJson = useDeferredValue(modelsSchemaDraft);
  const deferredStatsSchemaJson = useDeferredValue(statsSchemaDraft);
  const deferredCanonicalSchemaJson = useDeferredValue(canonicalSchemaDraft);

  useEffect(() => {
    setModelsSchemaDraft(modelsSchemaJson);
  }, [modelsSchemaJson]);
  useEffect(() => {
    setStatsSchemaDraft(statsSchemaJson);
  }, [statsSchemaJson]);
  useEffect(() => {
    setCanonicalSchemaDraft(canonicalSchemaJson);
  }, [canonicalSchemaJson]);
  useEffect(() => {
    if (activeNavigatorMode !== "json") {
      setJsonSyntaxMounted(false);
      return;
    }
    const timer = window.setTimeout(() => setJsonSyntaxMounted(true), 80);
    return () => window.clearTimeout(timer);
  }, [activeNavigatorMode, objectSectionTab, modelsSchemaDraft, statsSchemaDraft, canonicalSchemaDraft]);

  return {
    jsonSyntaxMounted,
    jsonSectionOpen,
    jsonSectionEditorMode,
    modelsSchemaDraft,
    statsSchemaDraft,
    canonicalSchemaDraft,
    jsonApplyError,
    deferredModelsSchemaJson,
    deferredStatsSchemaJson,
    deferredCanonicalSchemaJson,
    setJsonSectionOpen,
    setJsonSectionEditorMode,
    setModelsSchemaDraft,
    setStatsSchemaDraft,
    setCanonicalSchemaDraft,
    setJsonApplyError,
  };
}
