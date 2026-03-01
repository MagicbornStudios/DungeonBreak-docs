# Panel Architecture: ASCII-First, No Random Popups

**Status:** Design doc  
**Location:** `.planning/PANEL-ARCHITECTURE.md`  
**Related:** KAPLAY-INTERFACE-SPEC, UI-COMPONENT-REGISTRY

---

## Principle

Content panels (equipment, bag, actions, info, skills) are **fixed layout**. Nothing pops up randomly. Panels swap content in-place; layout is predictable.

---

## Layout Model

### First-Person (React) and Grid (KAPLAY)

Both use the same conceptual layout:

- **Left panel:** Switches content by hotkey. Legend at bottom. Content area above.
  - `[e]` Equipment → equipment slots
  - `[b]` Bag → inventory list
  - `[x]` Actions → action groups (turn-consuming)
  - `[i]` Info → current room + character status
  - `[s]` Skills → list + evolution tabs

- **Center:** Narrative (first-person) or ASCII map (grid).

- **Right panel:** Current room info (always). Or journal when invoked.

- **Feed:** Monospace, line-by-line. Scroll to bottom. No chat bubbles or floating UI.

---

## Construction Rules

| Rule | Meaning |
|------|---------|
| **Fixed slots** | Panels have reserved regions. Content fills slots; no overflow popovers. |
| **Monospace dominant** | Feed, status, room info use mono font. Narrative can use serif. |
| **ASCII aesthetic** | Bordered boxes, `---` separators, `[Label]` for buttons. Think terminal, not Material. |
| **No modals for core flow** | Cutscenes block; equipment/bag/actions are in-panel, not dialogs. |
| **State-driven content** | Panel content = `f(state)`. Same state ⇒ same layout. No animation-driven surprises. |

---

## Panel Content Swap (Not Popup)

When user presses `[b]`:

1. Left panel **content area** clears.
2. Content area renders bag list (from `entity.inventory`).
3. Legend stays: `[e] equip [b] bag [x] actions [i] info [s] skills`.
4. No modal, no overlay, no slide-in. Just a content swap.

---

## React Implementation

- Use a single left column with `useState<"equipment"|"bag"|"actions"|"info"|"skills">`.
- Render `{content}` based on state. Each view is a pure component: `BagPanel({ inventory })`, `EquipmentPanel({ equipped })`, etc.
- Legend at bottom: always visible.
- Actions panel = current `ActionPanel` but styled with borders/mono, not Card/chrome.

---

## KAPLAY Implementation

- Left panel = scene layer. `k.add([...])` for legend; content area = conditional `k.add` based on `panelMode`.
- Same pattern: one content block, swap on keypress.
- Primitives: `k.rect`, `k.text`, `k.area` for clickable. No floating elements.

---

## Equipment, Bag, Skills (Future)

When engine gains:

- **Equipment:** Slots from content pack. Panel shows grid of slots + item names. No drag-drop for now; select slot → pick from bag.
- **Bag:** List. `entity.inventory`. Simple scroll.
- **Skills:** Tabs (list | evolution). Same panel, tab state switches content.

All in-panel. No random popups.
