import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { afterEach, describe, expect, test } from "vitest";

import {
  getAiFlagDefinition,
  isAiFlagEnabled,
  loadAiFlagConfig,
  resetAiFlagConfigCache,
} from "@/lib/ai-flags";

describe("ai flag config", () => {
  const originalEnvPath = process.env.AI_FLAGS_TOML_PATH;

  afterEach(() => {
    if (originalEnvPath) {
      process.env.AI_FLAGS_TOML_PATH = originalEnvPath;
    } else {
      delete process.env.AI_FLAGS_TOML_PATH;
    }
    resetAiFlagConfigCache();
  });

  test("loads default flag definitions from toml", () => {
    const config = loadAiFlagConfig();
    expect(config.flags["ai.schema.publish"].default).toBe(false);
    expect(config.flags["ai.subscription.entitlement-check"].mode).toBe("observe");
  });

  test("applies cohort override before defaults", () => {
    const enabled = isAiFlagEnabled("ai.assistant.session-routing", { cohort: "internal" });
    expect(enabled).toBe(true);
  });

  test("environment toml path overrides defaults", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "db-ai-flags-"));
    const overridePath = path.join(tempDir, "flags.toml");
    writeFileSync(
      overridePath,
      [
        "[flags.\"ai.schema.publish\"]",
        "default = true",
        "owner = \"content\"",
      ].join("\n"),
      "utf8",
    );
    process.env.AI_FLAGS_TOML_PATH = overridePath;
    resetAiFlagConfigCache();

    const definition = getAiFlagDefinition("ai.schema.publish");
    expect(definition.default).toBe(true);

    rmSync(tempDir, { recursive: true, force: true });
  });
});
