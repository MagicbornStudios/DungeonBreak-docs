export type ContentCreatorTreeNode = {
  id: string;
  name: string;
  nodeType: "group" | "model" | "instance" | "object-group" | "object" | "model-group";
  modelId?: string;
  baseModelId?: string;
  instanceId?: string;
  canonical?: boolean;
  objectType?: string;
  objectId?: string;
  children?: ContentCreatorTreeNode[];
};

type ModelFeatureRef = {
  featureId: string;
  spaces: string[];
  required?: boolean;
  defaultValue?: number;
};

type RuntimeModelSchemaRow = {
  modelId: string;
  label: string;
  description?: string;
  extendsModelId?: string;
  attachedStatModelIds?: string[];
  featureRefs: ModelFeatureRef[];
};

type ModelInstanceBinding = {
  id: string;
  name: string;
  modelId: string;
  canonical: boolean;
};

type BuildContentCreatorTreesParams = {
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  modelInstances: ModelInstanceBinding[];
  formatModelIdForUi: (value: string) => string;
};

export function buildContentCreatorTrees({
  runtimeModelSchemas,
  modelInstances,
  formatModelIdForUi,
}: BuildContentCreatorTreesParams): {
  modelsTreeData: ContentCreatorTreeNode[];
  canonicalTreeData: ContentCreatorTreeNode[];
} {
  const stats = runtimeModelSchemas.filter((row) => row.modelId.endsWith("stats"));
  const models = runtimeModelSchemas.filter((row) => !row.modelId.endsWith("stats"));
  const buildModelNode = (model: RuntimeModelSchemaRow): ContentCreatorTreeNode => {
    const instanceNodes = modelInstances
      .filter((instance) => instance.modelId === model.modelId && !instance.canonical)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((instance) => ({
        id: `instance:${instance.id}`,
        name: instance.name,
        nodeType: "instance" as const,
        modelId: instance.modelId,
        instanceId: instance.id,
        canonical: instance.canonical,
      }));
    return {
      id: `model:${model.modelId}`,
      name: formatModelIdForUi(model.modelId),
      nodeType: "model",
      modelId: model.modelId,
      children: instanceNodes,
    };
  };
  const buildNamespaceTree = (
    items: RuntimeModelSchemaRow[],
    prefix: string,
    leafNodeFactory?: (model: RuntimeModelSchemaRow, displayName: string) => ContentCreatorTreeNode,
  ): ContentCreatorTreeNode[] => {
    type NsNode = {
      id: string;
      name: string;
      nodeType: "model-group";
      path: string[];
      modelNode: ContentCreatorTreeNode | null;
      children: Map<string, NsNode | ContentCreatorTreeNode>;
    };
    const root = new Map<string, NsNode | ContentCreatorTreeNode>();
    const ensureNamespaceNode = (
      map: Map<string, NsNode | ContentCreatorTreeNode>,
      path: string[],
    ): NsNode => {
      const nsId = `${prefix}:${path.join(".")}`;
      const key = `ns:${path.join(".")}`;
      const existing = map.get(key);
      if (existing && "nodeType" in existing && existing.nodeType === "model-group") {
        return existing as NsNode;
      }
      const created: NsNode = {
        id: nsId,
        name: path[path.length - 1] ?? "group",
        nodeType: "model-group",
        path,
        modelNode: null,
        children: new Map<string, NsNode | ContentCreatorTreeNode>(),
      };
      map.set(key, created);
      return created;
    };
    for (const row of items) {
      const parts = row.modelId.split(".").filter(Boolean);
      const rawLeaf = parts[parts.length - 1] ?? row.modelId;
      const leafName =
        rawLeaf === "base" && parts.length > 1
          ? formatModelIdForUi(parts[parts.length - 2] ?? row.modelId)
          : formatModelIdForUi(rawLeaf);
      let cursor = root;
      for (let i = 0; i < parts.length; i += 1) {
        const ns = ensureNamespaceNode(cursor, parts.slice(0, i + 1));
        if (i === parts.length - 1) {
          const leaf = leafNodeFactory ? leafNodeFactory(row, leafName) : { ...buildModelNode(row), name: leafName };
          ns.modelNode = {
            ...leaf,
            name: leafName,
          };
        } else {
          cursor = ns.children;
        }
      }
    }
    const toTree = (map: Map<string, NsNode | ContentCreatorTreeNode>): ContentCreatorTreeNode[] =>
      Array.from(map.values())
        .map((node) => {
          if ("nodeType" in node && node.nodeType === "model-group") {
            const nsNode = node as NsNode;
            const children = toTree(nsNode.children);
            if (nsNode.modelNode) {
              const modelChildren = nsNode.modelNode.children ?? [];
              return {
                ...nsNode.modelNode,
                children: [...modelChildren, ...children],
              };
            }
            return {
              id: nsNode.id,
              name: nsNode.name,
              nodeType: "model-group" as const,
              children,
            };
          }
          return node as ContentCreatorTreeNode;
        })
        .sort((a, b) => {
          if (a.nodeType === "model-group" && b.nodeType !== "model-group") return -1;
          if (a.nodeType !== "model-group" && b.nodeType === "model-group") return 1;
          return a.name.localeCompare(b.name);
        });
    return toTree(root);
  };
  const statRoots = buildNamespaceTree(stats, "stats");
  const modelRoots = buildNamespaceTree(models, "models");
  const canonicalInstanceMap = modelInstances
    .filter((instance) => instance.canonical)
    .reduce((map, instance) => {
      const list = map.get(instance.modelId) ?? [];
      list.push(instance);
      map.set(instance.modelId, list);
      return map;
    }, new Map<string, ModelInstanceBinding[]>());
  const canonicalGroups = buildNamespaceTree(models, "canonical", (model, displayName) => {
    const instances = (canonicalInstanceMap.get(model.modelId) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((instance) => ({
        id: `instance:${instance.id}`,
        name: instance.name,
        nodeType: "instance" as const,
        modelId: instance.modelId,
        instanceId: instance.id,
        canonical: true,
      }));
    return {
      id: `canonical-model:${model.modelId}`,
      name: displayName,
      nodeType: "model" as const,
      modelId: model.modelId,
      children: instances,
    };
  });
  return {
    modelsTreeData: [
      {
        id: "group:models",
        name: "models",
        nodeType: "group" as const,
        children: [
          {
            id: "group:stats",
            name: "stats",
            nodeType: "group" as const,
            children: statRoots,
          },
          ...modelRoots,
        ],
      },
    ],
    canonicalTreeData: [
      {
        id: "group:canonical",
        name: "canonical",
        nodeType: "group" as const,
        children: canonicalGroups,
      },
    ],
  };
}
