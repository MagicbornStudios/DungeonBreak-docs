#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUT_PATH = resolve("packages/engine/src/escape-the-dungeon/contracts/data/dungeons.json");

const ROOM_NAMES = [
  "Cinder Keep","Nova Canal","Frost Bridge","Onyx Shrine","Briar Anvil","Scarlet Station","Dusk Aisle","Ember Barracks","Granite Observatory","Aether Crossing",
  "Spiral Basin","Gilded Antechamber","Hollow Ring","Sable Vault","Warden Spire","Crystal Node","Forge Hub","Phantom Plaza","Lumen Engine","Verdant Chamber",
  "Dawn Vestibule","Rune Walk","Ash Gate","Ivory Workshop","Timber Foundry","Mosaic Lattice","Shale Court","Echo Sanctum","Morrow Gallery","Drift Garden",
  "Vault Passage","Prism Concourse","Nimbus Reservoir","Beacon Forum","Tidal Ascent","Zenith Quarry","Iron Library","Bastion Nexus","Mirror Gallery","Storm Terrace",
  "Silk Archive","Pulse Ward","Signal Cloister","Obsidian Refuge","Oracle Hall","Umbral Atrium","Thorn Kiln","Copper Rotunda","Aurora Dock","Sunken Atrium",
];

const ITEM_NAMES = [
  "Vigil Lens","Kite Shard","Brass Brooch","Arc Talisman","Orbit Mirror","Beacon Cartridge","Nova Ring","Rune Hammer","Relic Scroll","Drift Cloak",
  "Dawn Flask","Prism Whistle","Fang Orb","Loom Sheath","Flare Injector","Torrent Medallion","Frost Emitter","Harbor Module","Storm Totem","Signal Device",
  "Whisper Bell","Crest Compass","Pillar Helm","Pulse Charm","Glyph Anchor","Cinder Spindle","Cipher Needle","Lattice Mask","Tide Loop","Onyx Seal",
  "Sun Coil","Warden Pin","Echo Plate","Briar Spur","Thorn Charm","Aurora Capsule","Granite Sigil","Morrow Coin","Rift Lantern","Sable Ingot",
  "Aether Prism","Obsidian Rod","Star Etching","Umbral Shard","Verdant Vial","Mirror Locket","Forge Capacitor","Pulse Cartridge","Oracle Thread","Seeker Knot",
];

const FEATURES = ["training","dialogue","rest","combat","treasure","rune_forge"];
const RARITIES = ["common","rare","epic","legendary"];

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(13371337);

function pick(arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function vectorForIndex(i) {
  const n = (v) => Math.round(v * 100) / 100;
  return {
    Comprehension: n(((i * 3) % 15) / 100),
    Constraint: n(((i * 5 + 2) % 18) / 100),
    Construction: n(((i * 7 + 4) % 16) / 100),
    Direction: n(((i * 11 + 6) % 20) / 100),
    Empathy: n(((i * 13 + 1) % 14) / 100),
    Equilibrium: n(((i * 17 + 3) % 15) / 100),
    Freedom: n(((i * 19 + 2) % 18) / 100),
    Levity: n(((i * 23 + 3) % 16) / 100),
    Projection: n(((i * 29 + 5) % 22) / 100),
    Survival: n(((i * 31 + 1) % 20) / 100),
  };
}

function itemDeltaForIndex(i) {
  const n = (v) => Math.round(v * 100) / 100;
  return {
    Direction: n(0.02 + ((i * 3) % 6) / 100),
    Survival: n(0.02 + ((i * 5) % 6) / 100),
    Projection: n(((i * 7) % 8) / 100),
  };
}

const roomBlueprints = ROOM_NAMES.map((name, i) => ({
  roomBlueprintId: `room_${String(i + 1).padStart(3, "0")}`,
  name,
  feature: FEATURES[i % FEATURES.length],
  baseVector: vectorForIndex(i),
  description: `${name}.` ,
}));

const itemBlueprints = ITEM_NAMES.map((name, i) => ({
  itemBlueprintId: `item_${String(i + 1).padStart(3, "0")}`,
  name,
  rarity: RARITIES[i % RARITIES.length],
  description: `Field-forged ${name.toLowerCase()} tuned for dungeon traversal.`,
  tags: ["loot", name.split(" ")[0].toLowerCase()],
  vectorDelta: itemDeltaForIndex(i),
}));

const totalLevels = 12;
const rows = 4;
const columns = 4;
const roomSize = { x: 14, y: 10, z: 6 };
const heightScales = [1, 1.15, 1.35, 1.05, 1.45, 1.2, 1.55, 1.1, 1.4, 1.25, 1.6, 1.18];
let zCursor = 0;
let roomCounter = 0;

function roomId(depth, index) {
  return `L${String(depth).padStart(2, "0")}_R${String(index).padStart(3, "0")}`;
}

const levels = [];

for (let li = 0; li < totalLevels; li += 1) {
  const depth = totalLevels - li;
  const heightScale = heightScales[li] ?? 1;
  const levelPosition = { x: 0, y: 0, z: zCursor };
  const rooms = [];

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < columns; c += 1) {
      const index = r * columns + c;
      const blueprintIndex = roomCounter < roomBlueprints.length
        ? roomCounter
        : Math.floor(rng() * roomBlueprints.length);
      const blueprint = roomBlueprints[blueprintIndex];
      const thisRoomId = roomId(depth, index);
      const feature = depth === 12 && index === 0
        ? "start"
        : depth === 1 && index === rows * columns - 1
          ? "escape_gate"
          : depth < 12 && index === 0
            ? "stairs_up"
            : depth > 1 && index === rows * columns - 1
              ? "stairs_down"
              : blueprint.feature;

      const exits = [];
      if (r > 0) exits.push({ direction: "north", depth, roomId: roomId(depth, (r - 1) * columns + c) });
      if (r < rows - 1) exits.push({ direction: "south", depth, roomId: roomId(depth, (r + 1) * columns + c) });
      if (c > 0) exits.push({ direction: "west", depth, roomId: roomId(depth, r * columns + (c - 1)) });
      if (c < columns - 1) exits.push({ direction: "east", depth, roomId: roomId(depth, r * columns + (c + 1)) });
      if (index === 0 && depth < totalLevels) exits.push({ direction: "up", depth: depth + 1, roomId: roomId(depth + 1, rows * columns - 1) });
      if (index === rows * columns - 1 && depth > 1) exits.push({ direction: "down", depth: depth - 1, roomId: roomId(depth - 1, 0) });

      const itemCount = 1 + (rng() > 0.55 ? 1 : 0);
      const items = [];
      for (let ii = 0; ii < itemCount; ii += 1) {
        const itemBlueprint = pick(itemBlueprints);
        const itemPos = {
          x: 1 + (ii * 2.5) + Math.round(rng() * 10) / 10,
          y: 0,
          z: 1 + Math.round(rng() * 4) / 10,
        };
        items.push({
          itemId: `${itemBlueprint.itemBlueprintId}_${depth}_${index}_${ii}`,
          itemBlueprintId: itemBlueprint.itemBlueprintId,
          name: itemBlueprint.name,
          rarity: itemBlueprint.rarity,
          description: itemBlueprint.description,
          tags: itemBlueprint.tags,
          vectorDelta: itemBlueprint.vectorDelta,
          isPresent: true,
          transform: {
            position: itemPos,
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
        });
      }

      const roomPos = {
        x: c * roomSize.x,
        y: r * roomSize.y * heightScale,
        z: levelPosition.z,
      };

      rooms.push({
        roomId: thisRoomId,
        roomBlueprintId: blueprint.roomBlueprintId,
        name: blueprint.name,
        row: r,
        column: c,
        index,
        feature,
        description: `${blueprint.name}. Depth ${depth}, coordinate (${r},${c}).`,
        baseVector: blueprint.baseVector,
        exits,
        items,
        transform: {
          position: roomPos,
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: heightScale, z: 1 },
        },
      });
      roomCounter += 1;
    }
  }

  levels.push({
    depth,
    rows,
    columns,
    heightScale,
    transform: {
      position: levelPosition,
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: heightScale, z: 1 },
    },
    rooms,
  });

  zCursor += roomSize.z;
}

const root = {
  dungeons: [
    {
      dungeonId: "default-escape",
      title: "Escape the Dungeon",
      startDepth: 12,
      startRoomId: "L12_R000",
      escapeDepth: 1,
      escapeRoomId: "L01_R015",
      roomSize,
      levelSpacing: 0,
      dungeonOrigin: { x: 0, y: 0, z: 0 },
      roomBlueprints,
      itemBlueprints,
      levels,
    },
  ],
};

writeFileSync(OUT_PATH, `${JSON.stringify(root, null, 2)}\n`, "utf8");
console.log(`Wrote ${OUT_PATH}`);
