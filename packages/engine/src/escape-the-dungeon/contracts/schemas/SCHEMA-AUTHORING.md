# Schema authoring standard

The **content editor is the source of all schemas.** Game data references those schemas and builds out each game using the data.

---

## Ownership

- **Schemas** are **editor-owned**. The content editor defines and holds the canonical schemas (content-common, content-source, content-pack-bundle, lookup schemas). All pack shapes (ItemPack, ItemPackItem, RoomItem, …) and primitives live in these schemas.
- **Game data** (e.g. content-source.json, items.json) **references** those schemas via `$schema` and fills in the content. Games do not define the schema; they author data that conforms to it. The engine loads validated data that matches the editor schemas.
- **content-common.schema.json** holds **shared primitives**: Vector, VectorDelta, VisualReference, Vec3, Transform. Pack schemas define pack shapes and reference content-common where useful. Codegen may duplicate primitives locally so tools that do not resolve external `$ref` still work.

---

## Primitives

| Definition    | Meaning |
|---------------|--------|
| **Vector**    | Key→number; stats/traits—any point or values. Keys = ids from lookup packs (trait_*, stat_combat_*). |
| **VectorDelta** | Same shape; modifiers applied to a Vector. |
| **VisualReference** | Sprite refs (spriteCollection, frontSpriteUrl, etc.). |
| **Vec3**      | x, y, z. |
| **Transform** | position, rotation, scale (each Vec3). |

**Terminology:** A **trait** is one dimension of the vector of stats for the narrative; we call that set of dimensions **traits**. Same shape as combat stats (key→number); different lookup pack.

---

## Conventions

- **Lookup ids:** Content refers to lookup packs by id (trait_*, stat_combat_*, rarityId, equip_slot_id). Schema describes by convention; editor can offer ref pickers from the corresponding lookup pack.
- **Single responsibility:** One definition per concept. Reuse via `$ref`; extend via `allOf` when adding properties.
- **No duplicate definitions:** Primitives live in content-common (or are duplicated locally only where codegen requires it). Pack shapes live in pack schemas and reference primitives.

---

## Files

These schema files are the **editor's** source of truth. Data files reference them via `$schema`.

- **content-common.schema.json** – Shared primitives (Vector, VectorDelta, VisualReference, Vec3, Transform).
- **content-source.schema.json** – Content source shape; defines ItemPack, ItemPackItem, ItemBlueprint, RoomItem, etc. Used by games (e.g. EtD) whose data conforms to this schema.
- **content-pack-bundle.schema.json** – Bundle shape consumed by the engine; same concepts, self-contained for codegen where needed.

See [README.md](README.md) for the data ↔ schema mapping and how to add a new pack.
