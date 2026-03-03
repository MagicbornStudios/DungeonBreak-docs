import { describe, expect, test } from "vitest";
import { GET, POST } from "@/app/api/content-packs/reports/route";

describe("content-pack reports route", () => {
  test("persists bundle analysis and returns retrievable report", async () => {
    const sourceName = `unit-bundle-${Date.now()}.json`;
    const bundle = {
      schemaVersion: "content-pack.bundle.v1",
      generatedAt: new Date().toISOString(),
      hashes: { overall: "abc" },
      packs: {
        spaceVectors: {
          featureSchema: [
            { featureId: "unit_feature", label: "Unit Feature", groups: ["content_features"], spaces: ["dialogue"] },
          ],
          modelSchemas: [
            {
              modelId: "entity.unit",
              label: "Entity Unit",
              featureRefs: [{ featureId: "unit_feature", spaces: ["dialogue"], required: true }],
            },
          ],
        },
      },
    };

    const postResponse = await POST(
      new Request("http://localhost/api/content-packs/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceName, bundle, persist: true }),
      }),
    );
    const postBody = (await postResponse.json()) as {
      ok: boolean;
      report?: { reportId: string; summary: { spaceVectors: { featureCount: number; modelCount: number } } };
    };
    expect(postBody.ok).toBe(true);
    expect(postBody.report?.summary.spaceVectors.featureCount).toBe(1);
    expect(postBody.report?.summary.spaceVectors.modelCount).toBe(1);
    const reportId = postBody.report?.reportId;
    expect(reportId).toBeTruthy();

    const listResponse = await GET(new Request("http://localhost/api/content-packs/reports"));
    const listBody = (await listResponse.json()) as { ok: boolean; entries?: Array<{ reportId: string }> };
    expect(listBody.ok).toBe(true);
    expect((listBody.entries ?? []).some((entry) => entry.reportId === reportId)).toBe(true);

    const itemResponse = await GET(
      new Request(`http://localhost/api/content-packs/reports?reportId=${encodeURIComponent(String(reportId))}`),
    );
    const itemBody = (await itemResponse.json()) as {
      ok: boolean;
      report?: { reportId: string; bundle?: { spaceVectors?: unknown } };
    };
    expect(itemBody.ok).toBe(true);
    expect(itemBody.report?.reportId).toBe(reportId);
    expect(itemBody.report?.bundle?.spaceVectors).toBeTruthy();
  });
});
