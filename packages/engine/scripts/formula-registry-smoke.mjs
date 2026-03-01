import { FORMULA_REGISTRY_VERSION, formulaRegistry } from "../dist/index.js";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const baselineStatus = {
  level: 1,
  traits: { Comprehension: 0.2 },
  features: { Awareness: 0.1 },
};
const baseline = formulaRegistry.fogMetrics(baselineStatus);
assert(FORMULA_REGISTRY_VERSION === "v1.0.0", `Unexpected formula version: ${FORMULA_REGISTRY_VERSION}`);
assert(baseline.radius === 1, `Expected baseline fog radius 1, got ${baseline.radius}`);

const advancedStatus = {
  level: 12,
  traits: { Comprehension: 1.4 },
  features: { Awareness: 1.2 },
};
const advanced = formulaRegistry.fogMetrics(advancedStatus);
assert(advanced.radius === 4, `Expected advanced fog radius 4, got ${advanced.radius}`);
assert(advanced.levelFactor === 1, "Expected levelFactor=1");
assert(advanced.comprehensionFactor === 1, "Expected comprehensionFactor=1");
assert(advanced.awarenessFactor === 1, "Expected awarenessFactor=1");

console.log(`Formula registry smoke passed. Version ${FORMULA_REGISTRY_VERSION}.`);

