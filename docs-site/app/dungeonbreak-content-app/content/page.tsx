"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ContentPackRegistryEntry } from "@dungeonbreak/engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type ContentPacksResponse = {
  ok: boolean;
  packs?: ContentPackRegistryEntry[];
  error?: string;
};

type ProjectSummary = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  exportRoot: string;
  sourceMode: string;
  notes: string;
  schemaImportCount: number;
  packCount: number;
};

type ProjectDetail = {
  ok: boolean;
  project?: {
    id: string;
    name: string;
    slug: string;
    description: string;
    status: string;
    exportRoot: string;
    sourceMode: string;
    notes: string;
    updatedAt: string | null;
    createdAt: string | null;
  };
  schemaImports?: Array<{
    id: string;
    packId: string;
    title: string;
    kind: string;
    exportName: string;
    sourceFile: string;
    contentSourcePath: string | null;
    schemaVersion: string | null;
    importStatus: string;
    updatedAt: string | null;
  }>;
  packs?: Array<{
    id: string;
    packId: string;
    title: string;
    kind: string;
    exportName: string;
    sourceFile: string;
    contentSourcePath: string | null;
    bundleKey: string | null;
    schemaVersion: string | null;
    status: string;
    updatedAt: string | null;
    document: JsonValue;
  }>;
  customSchemas?: Array<{
    id: string;
    schemaId: string;
    name: string;
    targetPackId: string | null;
    schemaType: string;
    status: string;
    updatedAt: string | null;
    document: JsonValue;
  }>;
  projectData?: Array<{
    id: string;
    dataId: string;
    name: string;
    projectLayer: string;
    namespace: string;
    targetId: string | null;
    status: string;
    updatedAt: string | null;
    document: JsonValue;
  }>;
  revisions?: Array<{
    id: string;
    key: string;
    targetType: string;
    targetKey: string;
    targetName: string;
    targetDocumentId: string;
    changeKind: string;
    notes: string;
    updatedAt: string | null;
    createdAt: string | null;
  }>;
  publishJobs?: Array<{
    id: string;
    jobId: string;
    status: string;
    exportRoot: string;
    commands: string[];
    exportFiles: string[];
    engineFiles: string[];
    skippedPacks: string[];
    errorMessage: string;
    updatedAt: string | null;
    createdAt: string | null;
  }>;
  imported?: number;
  importedPackIds?: string[];
  exportRoot?: string;
  files?: string[];
  publish?: {
    exportRoot: string;
    exportFiles: string[];
    engineFiles: string[];
    skippedPacks: string[];
    commands: string[];
  };
  error?: string;
};

type ProjectsResponse = {
  ok: boolean;
  projects?: ProjectSummary[];
  error?: string;
};

const emptyProjectForm = {
  name: "",
  slug: "",
  description: "",
  notes: "",
};

const emptyCustomSchemaForm = {
  schemaId: "",
  name: "",
  targetPackId: "",
  schemaType: "json-schema",
  documentText:
    '{\n  "$schema": "https://json-schema.org/draft/2020-12/schema",\n  "type": "object",\n  "properties": {}\n}\n',
};

const emptyProjectDataForm = {
  dataId: "",
  name: "",
  namespace: "generic-extension",
  targetId: "",
  documentText: '{\n  "notes": "Project-scoped docs-site / Payload data"\n}\n',
};

function prettyJson(value: JsonValue): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function parseEditorJson(value: string): JsonValue {
  return JSON.parse(value) as JsonValue;
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "n/a";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function badgeClass(status: string): string {
  if (status === "published" || status === "succeeded" || status === "exported") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }
  if (status === "validated" || status === "running" || status === "imported") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-200";
  }
  if (status === "failed") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  }
  return "border-border bg-background/40 text-muted-foreground";
}

export default function DungeonbreakContentAppContentPage() {
  const [registry, setRegistry] = useState<ContentPackRegistryEntry[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [createForm, setCreateForm] = useState(emptyProjectForm);
  const [projectForm, setProjectForm] = useState({
    name: "",
    slug: "",
    description: "",
    notes: "",
    status: "draft",
    exportRoot: "content-projects",
  });
  const [selectedPackId, setSelectedPackId] = useState<string>("");
  const [packEditorStatus, setPackEditorStatus] = useState<string>("edited");
  const [packEditorText, setPackEditorText] = useState<string>("{}\n");
  const [newCustomSchemaForm, setNewCustomSchemaForm] = useState(
    emptyCustomSchemaForm,
  );
  const [newProjectDataForm, setNewProjectDataForm] = useState(
    emptyProjectDataForm,
  );
  const [busyAction, setBusyAction] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [notice, setNotice] = useState<string>("");

  async function loadRegistry() {
    const response = await fetch("/api/content-packs");
    const body = (await response.json()) as ContentPacksResponse;
    if (!body.ok) {
      throw new Error(body.error ?? "Failed to load pack registry.");
    }
    setRegistry(body.packs ?? []);
  }

  async function loadProjects(nextSelectedId?: string) {
    const response = await fetch("/api/content-editor/projects");
    const body = (await response.json()) as ProjectsResponse;
    if (!body.ok) {
      throw new Error(body.error ?? "Failed to load projects.");
    }
    const nextProjects = body.projects ?? [];
    setProjects(nextProjects);
    const resolvedId =
      nextSelectedId ||
      (nextProjects.some((project) => project.id === selectedProjectId)
        ? selectedProjectId
        : nextProjects[0]?.id || "");
    setSelectedProjectId(resolvedId);
    return resolvedId;
  }

  async function loadProjectDetail(projectId: string) {
    if (!projectId) {
      setProjectDetail(null);
      return;
    }
    const response = await fetch(`/api/content-editor/projects/${projectId}`);
    const body = (await response.json()) as ProjectDetail;
    if (!body.ok) {
      throw new Error(body.error ?? "Failed to load project detail.");
    }
    setProjectDetail(body);
    if (body.project) {
      setProjectForm({
        name: body.project.name,
        slug: body.project.slug,
        description: body.project.description,
        notes: body.project.notes,
        status: body.project.status,
        exportRoot: body.project.exportRoot,
      });
    }
  }

  useEffect(() => {
    Promise.all([loadRegistry(), loadProjects()])
      .then(([, projectId]) => {
        if (projectId) {
          return loadProjectDetail(projectId);
        }
        return undefined;
      })
      .catch((nextError) => setError(String(nextError)));
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectDetail(null);
      return;
    }
    loadProjectDetail(selectedProjectId).catch((nextError) =>
      setError(String(nextError)),
    );
  }, [selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );
  const selectedPack = useMemo(
    () =>
      projectDetail?.packs?.find((pack) => pack.packId === selectedPackId) ??
      projectDetail?.packs?.[0] ??
      null,
    [projectDetail?.packs, selectedPackId],
  );

  useEffect(() => {
    if (!projectDetail?.packs?.length) {
      setSelectedPackId("");
      setPackEditorStatus("edited");
      setPackEditorText("{}\n");
      return;
    }
    const nextPack =
      projectDetail.packs.find((pack) => pack.packId === selectedPackId) ??
      projectDetail.packs[0];
    if (!nextPack) {
      return;
    }
    if (nextPack.packId !== selectedPackId) {
      setSelectedPackId(nextPack.packId);
    }
    setPackEditorStatus(nextPack.status);
    setPackEditorText(prettyJson(nextPack.document));
  }, [projectDetail?.packs, selectedPackId]);

  async function handleCreateProject() {
    try {
      setBusyAction("create");
      setError("");
      setNotice("");
      const response = await fetch("/api/content-editor/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const body = (await response.json()) as {
        ok: boolean;
        project?: { id: string; name: string };
        error?: string;
      };
      if (!body.ok || !body.project) {
        throw new Error(body.error ?? "Failed to create project.");
      }
      setCreateForm(emptyProjectForm);
      await loadProjects(body.project.id);
      await loadProjectDetail(body.project.id);
      setNotice(`Created project ${body.project.name}.`);
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setBusyAction("");
    }
  }

  async function handleSaveProject() {
    if (!selectedProjectId) {
      return;
    }
    try {
      setBusyAction("save");
      setError("");
      setNotice("");
      const response = await fetch(`/api/content-editor/projects/${selectedProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectForm),
      });
      const body = (await response.json()) as ProjectDetail;
      if (!body.ok) {
        throw new Error(body.error ?? "Failed to save project.");
      }
      setProjectDetail(body);
      await loadProjects(selectedProjectId);
      setNotice("Project metadata saved to Payload.");
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setBusyAction("");
    }
  }

  async function handleImportCanonical() {
    if (!selectedProjectId) {
      return;
    }
    try {
      setBusyAction("import");
      setError("");
      setNotice("");
      const response = await fetch(
        `/api/content-editor/projects/${selectedProjectId}/import-canonical`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const body = (await response.json()) as ProjectDetail;
      if (!body.ok) {
        throw new Error(body.error ?? "Failed to import canonical packs.");
      }
      setProjectDetail(body);
      await loadProjects(selectedProjectId);
      setNotice(
        `Imported ${body.imported ?? 0} canonical packs into the selected Payload project.`,
      );
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setBusyAction("");
    }
  }

  async function handleExportProject() {
    if (!selectedProjectId) {
      return;
    }
    try {
      setBusyAction("export");
      setError("");
      setNotice("");
      const response = await fetch(
        `/api/content-editor/projects/${selectedProjectId}/export`,
        {
          method: "POST",
        },
      );
      const body = (await response.json()) as ProjectDetail;
      if (!body.ok) {
        throw new Error(body.error ?? "Failed to export project files.");
      }
      setProjectDetail(body);
      await loadProjects(selectedProjectId);
      setNotice(
        `Exported ${body.files?.length ?? 0} files to ${body.exportRoot ?? "content-projects"}.`,
      );
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setBusyAction("");
    }
  }

  async function handlePublishProject() {
    if (!selectedProjectId) {
      return;
    }
    try {
      setBusyAction("publish");
      setError("");
      setNotice("");
      const response = await fetch(
        `/api/content-editor/projects/${selectedProjectId}/publish`,
        {
          method: "POST",
        },
      );
      const body = (await response.json()) as ProjectDetail;
      if (!body.ok) {
        throw new Error(body.error ?? "Failed to publish project.");
      }
      setProjectDetail(body);
      await loadProjects(selectedProjectId);
      setNotice(
        `Published ${body.publish?.engineFiles.length ?? 0} engine files and refreshed game artifacts.`,
      );
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setBusyAction("");
    }
  }

  async function handleSavePackDocument() {
    if (!selectedProjectId || !selectedPack) {
      return;
    }
    try {
      setBusyAction("save-pack");
      setError("");
      setNotice("");
      const response = await fetch(
        `/api/content-editor/projects/${selectedProjectId}/packs/${selectedPack.packId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: packEditorStatus,
            document: parseEditorJson(packEditorText),
          }),
        },
      );
      const body = (await response.json()) as ProjectDetail;
      if (!body.ok) {
        throw new Error(body.error ?? "Failed to save pack document.");
      }
      setProjectDetail(body);
      setNotice(`Saved ${selectedPack.packId} into Payload.`);
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setBusyAction("");
    }
  }

  async function handleCreateCustomSchema() {
    if (!selectedProjectId) {
      return;
    }
    try {
      setBusyAction("create-custom-schema");
      setError("");
      setNotice("");
      const response = await fetch(
        `/api/content-editor/projects/${selectedProjectId}/custom-schemas`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schemaId: newCustomSchemaForm.schemaId,
            name: newCustomSchemaForm.name,
            targetPackId: newCustomSchemaForm.targetPackId || undefined,
            schemaType: newCustomSchemaForm.schemaType,
            document: parseEditorJson(newCustomSchemaForm.documentText),
          }),
        },
      );
      const body = (await response.json()) as ProjectDetail;
      if (!body.ok) {
        throw new Error(body.error ?? "Failed to create custom schema.");
      }
      setProjectDetail(body);
      setNewCustomSchemaForm(emptyCustomSchemaForm);
      setNotice("Created custom schema in Payload.");
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setBusyAction("");
    }
  }

  async function handleCreateProjectData() {
    if (!selectedProjectId) {
      return;
    }
    try {
      setBusyAction("create-project-data");
      setError("");
      setNotice("");
      const response = await fetch(
        `/api/content-editor/projects/${selectedProjectId}/project-data`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataId: newProjectDataForm.dataId,
            name: newProjectDataForm.name,
            namespace: newProjectDataForm.namespace,
            targetId: newProjectDataForm.targetId || undefined,
            document: parseEditorJson(newProjectDataForm.documentText),
          }),
        },
      );
      const body = (await response.json()) as ProjectDetail;
      if (!body.ok) {
        throw new Error(body.error ?? "Failed to create project data.");
      }
      setProjectDetail(body);
      setNewProjectDataForm(emptyProjectDataForm);
      setNotice("Created docs-site/Payload project data record.");
    } catch (nextError) {
      setError(String(nextError));
    } finally {
      setBusyAction("");
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card/70">
        <CardHeader>
          <CardTitle>Payload Content Authoring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Payload is now the authoring store for content projects. Canonical
            engine pack schemas and pack documents can be imported into Payload,
            saved with project metadata, and exported back out as contract-shaped
            JSON files for the game.
          </p>
          <div className="rounded border border-border bg-muted/20 p-3 font-mono text-[11px] leading-relaxed">
            <p>Source registry: <code>@dungeonbreak/engine CONTENT_PACK_REGISTRY</code></p>
            <p>Authoring store: <code>Payload collections in docs-site</code></p>
            <p>Export root: <code>docs-site/content-projects/&lt;project-slug&gt;/</code></p>
            <p>
              Existing bundle/report path:
              {" "}
              <Link href="/play/reports/content-packs" className="text-primary underline">
                content pack reports
              </Link>
            </p>
          </div>
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          {notice ? <p className="text-xs text-emerald-300">{notice}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">Create Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <Input
                placeholder="Project name"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="project-slug"
                value={createForm.slug}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
                }
              />
              <textarea
                className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Project description"
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
              <textarea
                className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Project notes"
                value={createForm.notes}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
              <Button
                className="w-full"
                onClick={handleCreateProject}
                disabled={busyAction.length > 0}
              >
                {busyAction === "create" ? "Creating..." : "Create Payload Project"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {projects.length === 0 ? (
                <p className="text-muted-foreground">
                  No Payload authoring projects yet.
                </p>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className={`w-full rounded border px-3 py-2 text-left ${
                      selectedProjectId === project.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background/40"
                    }`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-foreground">
                        {project.name}
                      </span>
                      <span
                        className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${badgeClass(project.status)}`}
                      >
                        {project.status}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {project.slug}
                    </div>
                    <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
                      <span>{project.schemaImportCount} schema imports</span>
                      <span>{project.packCount} pack docs</span>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">
                {selectedProject?.name ?? "Select A Project"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {!projectDetail?.project ? (
                <p className="text-muted-foreground">
                  Create or select a project to import canonical schemas and pack
                  documents into Payload.
                </p>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      value={projectForm.name}
                      onChange={(event) =>
                        setProjectForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                    <Input
                      value={projectForm.slug}
                      onChange={(event) =>
                        setProjectForm((current) => ({
                          ...current,
                          slug: event.target.value,
                        }))
                      }
                    />
                    <select
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      value={projectForm.status}
                      onChange={(event) =>
                        setProjectForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                    >
                      <option value="draft">draft</option>
                      <option value="validated">validated</option>
                      <option value="published">published</option>
                    </select>
                    <Input
                      value={projectForm.exportRoot}
                      onChange={(event) =>
                        setProjectForm((current) => ({
                          ...current,
                          exportRoot: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <textarea
                    className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={projectForm.description}
                    onChange={(event) =>
                      setProjectForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                  <textarea
                    className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={projectForm.notes}
                    onChange={(event) =>
                      setProjectForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleSaveProject}
                      disabled={busyAction.length > 0}
                    >
                      {busyAction === "save" ? "Saving..." : "Save Project Info"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleImportCanonical}
                      disabled={busyAction.length > 0}
                    >
                      {busyAction === "import"
                        ? "Importing..."
                        : "Import Canonical Packs"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportProject}
                      disabled={busyAction.length > 0}
                    >
                      {busyAction === "export" ? "Exporting..." : "Export Files"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handlePublishProject}
                      disabled={busyAction.length > 0}
                    >
                      {busyAction === "publish"
                        ? "Publishing..."
                        : "Publish To Game"}
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-8">
                    <MetricCard
                      label="Schema Imports"
                      value={String(projectDetail.schemaImports?.length ?? 0)}
                    />
                    <MetricCard
                      label="Pack Docs"
                      value={String(projectDetail.packs?.length ?? 0)}
                    />
                    <MetricCard label="Registry Packs" value={String(registry.length)} />
                    <MetricCard
                      label="Source Mode"
                      value={projectDetail.project.sourceMode}
                    />
                    <MetricCard
                      label="Custom Schemas"
                      value={String(projectDetail.customSchemas?.length ?? 0)}
                    />
                    <MetricCard
                      label="Project Data"
                      value={String(projectDetail.projectData?.length ?? 0)}
                    />
                    <MetricCard
                      label="Revisions"
                      value={String(projectDetail.revisions?.length ?? 0)}
                    />
                    <MetricCard
                      label="Publish Jobs"
                      value={String(projectDetail.publishJobs?.length ?? 0)}
                    />
                  </div>

                  <div className="rounded border border-border bg-background/40 p-3 font-mono text-[11px]">
                    <div>Export root: {projectDetail.project.exportRoot}</div>
                    <div>Created: {formatTimestamp(projectDetail.project.createdAt)}</div>
                    <div>Updated: {formatTimestamp(projectDetail.project.updatedAt)}</div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="bg-card/60">
              <CardHeader>
                <CardTitle className="text-base">Imported Schemas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {projectDetail?.schemaImports?.length ? (
                  projectDetail.schemaImports.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded border border-border bg-background/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-foreground">
                          {entry.title}
                        </span>
                        <span className="font-mono uppercase text-muted-foreground">
                          {entry.kind}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {entry.packId} · {entry.exportName}
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        {entry.sourceFile}
                        {entry.contentSourcePath ? ` -> ${entry.contentSourcePath}` : ""}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    No schema imports yet. Import canonical packs first.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/60">
              <CardHeader>
                <CardTitle className="text-base">Pack Editor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {projectDetail?.packs?.length ? (
                  <div className="grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)]">
                    <div className="space-y-2">
                      {projectDetail.packs.map((pack) => (
                        <button
                          key={pack.id}
                          type="button"
                          className={`w-full rounded border px-3 py-2 text-left ${
                            selectedPack?.id === pack.id
                              ? "border-primary bg-primary/10"
                              : "border-border bg-background/40"
                          }`}
                          onClick={() => setSelectedPackId(pack.packId)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-foreground">
                              {pack.title}
                            </span>
                            <span
                              className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${badgeClass(pack.status)}`}
                            >
                              {pack.status}
                            </span>
                          </div>
                          <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                            {pack.packId} · {pack.exportName}
                          </div>
                          <div className="mt-2 text-[11px] text-muted-foreground">
                            {pack.sourceFile}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="space-y-3">
                      {selectedPack ? (
                        <>
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded border border-border bg-background/40 px-3 py-2">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                                Pack ID
                              </div>
                              <div className="mt-1 font-mono text-[11px]">
                                {selectedPack.packId}
                              </div>
                            </div>
                            <div className="rounded border border-border bg-background/40 px-3 py-2">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                                Export
                              </div>
                              <div className="mt-1 font-mono text-[11px]">
                                {selectedPack.exportName}
                              </div>
                            </div>
                            <div className="rounded border border-border bg-background/40 px-3 py-2">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                                Status
                              </div>
                              <div className="mt-1 font-mono text-[11px]">
                                {selectedPack.status}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <select
                              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                              value={packEditorStatus}
                              onChange={(event) =>
                                setPackEditorStatus(event.target.value)
                              }
                            >
                              <option value="imported">imported</option>
                              <option value="edited">edited</option>
                              <option value="exported">exported</option>
                            </select>
                            <Button
                              onClick={handleSavePackDocument}
                              disabled={busyAction.length > 0}
                            >
                              {busyAction === "save-pack"
                                ? "Saving..."
                                : "Save Pack JSON"}
                            </Button>
                          </div>
                          <textarea
                            className="min-h-[460px] w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-[11px] leading-relaxed"
                            value={packEditorText}
                            onChange={(event) =>
                              setPackEditorText(event.target.value)
                            }
                          />
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No pack documents in Payload yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/60">
              <CardHeader>
                <CardTitle className="text-base">Pack Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {projectDetail?.packs?.length ? (
                  projectDetail.packs.map((pack) => (
                    <div
                      key={pack.id}
                      className="rounded border border-border bg-background/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-foreground">
                          {pack.title}
                        </span>
                        <span className="font-mono uppercase text-muted-foreground">
                          {pack.status}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                        {pack.packId} · {pack.exportName}
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        {pack.sourceFile}
                        {pack.bundleKey ? ` · bundle ${pack.bundleKey}` : ""}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    No pack documents in Payload yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="bg-card/60">
              <CardHeader>
                <CardTitle className="text-base">Custom Schemas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-2 rounded border border-border bg-background/30 p-3">
                  <div className="font-semibold text-foreground">
                    Create Custom Schema
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      placeholder="schema id"
                      value={newCustomSchemaForm.schemaId}
                      onChange={(event) =>
                        setNewCustomSchemaForm((current) => ({
                          ...current,
                          schemaId: event.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="schema name"
                      value={newCustomSchemaForm.name}
                      onChange={(event) =>
                        setNewCustomSchemaForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                    <select
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      value={newCustomSchemaForm.schemaType}
                      onChange={(event) =>
                        setNewCustomSchemaForm((current) => ({
                          ...current,
                          schemaType: event.target.value,
                        }))
                      }
                    >
                      <option value="json-schema">json-schema</option>
                      <option value="object-schema">object-schema</option>
                      <option value="canonical-asset">canonical-asset</option>
                    </select>
                    <select
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      value={newCustomSchemaForm.targetPackId}
                      onChange={(event) =>
                        setNewCustomSchemaForm((current) => ({
                          ...current,
                          targetPackId: event.target.value,
                        }))
                      }
                    >
                      <option value="">all / project-wide</option>
                      {(projectDetail?.packs ?? []).map((pack) => (
                        <option key={pack.id} value={pack.packId}>
                          {pack.packId}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    className="min-h-48 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-[11px] leading-relaxed"
                    value={newCustomSchemaForm.documentText}
                    onChange={(event) =>
                      setNewCustomSchemaForm((current) => ({
                        ...current,
                        documentText: event.target.value,
                      }))
                    }
                  />
                  <Button
                    onClick={handleCreateCustomSchema}
                    disabled={busyAction.length > 0 || !selectedProjectId}
                  >
                    {busyAction === "create-custom-schema"
                      ? "Creating..."
                      : "Create Custom Schema"}
                  </Button>
                </div>

                {projectDetail?.customSchemas?.length ? (
                  projectDetail.customSchemas.map((schema) => (
                    <div
                      key={schema.id}
                      className="rounded border border-border bg-background/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-foreground">
                            {schema.name}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {schema.schemaId} · {schema.schemaType}
                          </div>
                        </div>
                        <span
                          className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${badgeClass(schema.status)}`}
                        >
                          {schema.status}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        target: {schema.targetPackId ?? "project-wide"}
                      </div>
                      <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                        {formatTimestamp(schema.updatedAt)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    No custom schemas saved for this project yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/60">
              <CardHeader>
                <CardTitle className="text-base">Project Data</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-2 rounded border border-border bg-background/30 p-3">
                  <div className="font-semibold text-foreground">
                    Create Project Data
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      placeholder="data id"
                      value={newProjectDataForm.dataId}
                      onChange={(event) =>
                        setNewProjectDataForm((current) => ({
                          ...current,
                          dataId: event.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="name"
                      value={newProjectDataForm.name}
                      onChange={(event) =>
                        setNewProjectDataForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                    <select
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      value={newProjectDataForm.namespace}
                      onChange={(event) =>
                        setNewProjectDataForm((current) => ({
                          ...current,
                          namespace: event.target.value,
                        }))
                      }
                    >
                      <option value="admin-ui">admin-ui</option>
                      <option value="workflow">workflow</option>
                      <option value="publishing">publishing</option>
                      <option value="rendering">rendering</option>
                      <option value="integration">integration</option>
                      <option value="generic-extension">generic-extension</option>
                    </select>
                    <Input
                      placeholder="optional target id"
                      value={newProjectDataForm.targetId}
                      onChange={(event) =>
                        setNewProjectDataForm((current) => ({
                          ...current,
                          targetId: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <textarea
                    className="min-h-48 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-[11px] leading-relaxed"
                    value={newProjectDataForm.documentText}
                    onChange={(event) =>
                      setNewProjectDataForm((current) => ({
                        ...current,
                        documentText: event.target.value,
                      }))
                    }
                  />
                  <Button
                    onClick={handleCreateProjectData}
                    disabled={busyAction.length > 0 || !selectedProjectId}
                  >
                    {busyAction === "create-project-data"
                      ? "Creating..."
                      : "Create Project Data"}
                  </Button>
                </div>

                {projectDetail?.projectData?.length ? (
                  projectDetail.projectData.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded border border-border bg-background/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-foreground">
                            {entry.name}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {entry.dataId} · {entry.namespace}
                          </div>
                        </div>
                        <span
                          className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${badgeClass(entry.status)}`}
                        >
                          {entry.status}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        surface: {entry.projectLayer}
                        {entry.targetId ? ` · target ${entry.targetId}` : ""}
                      </div>
                      <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                        {formatTimestamp(entry.updatedAt)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    No project data saved for this project yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="bg-card/60">
              <CardHeader>
                <CardTitle className="text-base">Revision History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {projectDetail?.revisions?.length ? (
                  projectDetail.revisions.map((revision) => (
                    <div
                      key={revision.id}
                      className="rounded border border-border bg-background/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-foreground">
                            {revision.targetName}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {revision.targetType} · {revision.targetKey}
                          </div>
                        </div>
                        <span
                          className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${badgeClass(revision.changeKind)}`}
                        >
                          {revision.changeKind}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        {revision.notes || "No notes."}
                      </div>
                      <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                        {formatTimestamp(revision.createdAt)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    No recorded revisions yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/60">
              <CardHeader>
                <CardTitle className="text-base">Publish Jobs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {projectDetail?.publishJobs?.length ? (
                  projectDetail.publishJobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded border border-border bg-background/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-foreground">
                            {job.jobId}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {formatTimestamp(job.createdAt)}
                          </div>
                        </div>
                        <span
                          className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${badgeClass(job.status)}`}
                        >
                          {job.status}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div className="rounded border border-border bg-background/30 px-2 py-1 font-mono text-[10px]">
                          {job.exportFiles.length} export files
                        </div>
                        <div className="rounded border border-border bg-background/30 px-2 py-1 font-mono text-[10px]">
                          {job.engineFiles.length} engine writes
                        </div>
                        <div className="rounded border border-border bg-background/30 px-2 py-1 font-mono text-[10px]">
                          {job.commands.length} commands
                        </div>
                        <div className="rounded border border-border bg-background/30 px-2 py-1 font-mono text-[10px]">
                          {job.skippedPacks.length} skipped packs
                        </div>
                      </div>
                      {job.errorMessage ? (
                        <div className="mt-2 text-[11px] text-rose-300">
                          {job.errorMessage}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    No publish jobs recorded yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {projectDetail?.files?.length ? (
            <Card className="bg-card/60">
              <CardHeader>
                <CardTitle className="text-base">Latest Export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 font-mono text-[11px]">
                <div className="text-muted-foreground">
                  {projectDetail.exportRoot}
                </div>
                {projectDetail.files.map((file) => (
                  <div key={file} className="rounded border border-border bg-background/40 px-3 py-2">
                    {file}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {projectDetail?.publish ? (
            <Card className="bg-card/60">
              <CardHeader>
                <CardTitle className="text-base">Latest Publish</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 font-mono text-[11px]">
                <div className="rounded border border-border bg-background/40 px-3 py-2">
                  <div>{projectDetail.publish.exportRoot}</div>
                  <div>{projectDetail.publish.engineFiles.length} engine file writes</div>
                  <div>{projectDetail.publish.commands.length} pipeline commands</div>
                </div>
                {projectDetail.publish.commands.map((command) => (
                  <div
                    key={command}
                    className="rounded border border-border bg-background/40 px-3 py-2"
                  >
                    {command}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card className="bg-card/60">
            <CardHeader>
              <CardTitle className="text-base">Canonical Registry</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {registry.map((pack) => (
                <div
                  key={pack.packId}
                  className="rounded border border-border bg-background/40 p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-foreground">{pack.title}</span>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      {pack.kind}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {pack.packId}
                  </div>
                  <div className="mt-2 space-y-1">
                    {Object.entries(pack.topLevelCounts).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">{key}</span>
                        <span className="font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-background/40 px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}
