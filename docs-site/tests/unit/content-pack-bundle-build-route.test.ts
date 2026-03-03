import { describe, expect, test } from "vitest";
import { POST } from "@/app/api/content-packs/build-bundle/route";

describe("content-pack bundle builder route", () => {
  test("merges space-vectors patch and returns a full bundle payload", async () => {
    const request = new Request("http://localhost/api/content-packs/build-bundle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        patchName: "unit-test.patch",
        spaceVectorsPatch: {
          featureSchema: [
            {
              featureId: "unit_feature",
              label: "Unit Feature",
              groups: ["content_features"],
              spaces: ["dialogue"],
              defaultValue: 0,
            },
          ],
          modelSchemas: [
            {
              modelId: "entity.unit",
              label: "Entity Unit",
              description: "Unit test model",
              featureRefs: [{ featureId: "unit_feature", spaces: ["dialogue"], required: true }],
            },
          ],
        },
      }),
    });

    const response = await POST(request);
    const body = (await response.json()) as {
      ok: boolean;
      bundle?: {
        schemaVersion: string;
        patchName: string;
        hashes: Record<string, string>;
        packs: { spaceVectors?: { featureSchema?: Array<{ featureId: string }>; modelSchemas?: Array<{ modelId: string }> } };
      };
      manifest?: {
        schemaVersion: string;
        models: Array<{ modelId: string }>;
      };
      error?: string;
    };

    expect(body.ok).toBe(true);
    expect(body.bundle).toBeDefined();
    expect(body.bundle?.schemaVersion).toBe("content-pack.bundle.v1");
    expect(body.bundle?.patchName).toBe("unit-test.patch");
    expect(body.bundle?.hashes.overall).toMatch(/^[a-f0-9]{64}$/);
    expect(body.bundle?.packs.spaceVectors?.featureSchema?.some((row) => row.featureId === "unit_feature")).toBe(true);
    expect(body.bundle?.packs.spaceVectors?.modelSchemas?.some((row) => row.modelId === "entity.unit")).toBe(true);
    expect(body.manifest?.schemaVersion).toBe("content-pack.manifest.v1");
    expect(body.manifest?.models.some((row) => row.modelId === "entity.unit")).toBe(true);
  });
});
