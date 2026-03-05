export type ModelMigrationOp = {
  id: string;
  instanceId: string;
  fromModelId: string;
  toModelId: string;
  at: string;
};

export function buildMigrationScript(migrationOps: ModelMigrationOp[]): string {
  return [
    "// model-instance migration ops",
    ...migrationOps.map((op) => `moveInstance("${op.instanceId}", "${op.fromModelId}", "${op.toModelId}");`),
  ].join("\n");
}

