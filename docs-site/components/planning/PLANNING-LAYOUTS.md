# Planning cockpit – layout and design system

Layouts, color context, icons, and behaviors so the UI stays consistent and predictable.

---

## 1. Shape of things (structure)

- **App shell**: `AppDashboardShell` = sidebar (nav) + header (logo, Codex, GitHub) + main (page content). Planning lives inside main as one page.
- **Planning page**: Single full-height card (`h-[calc(100vh-6rem)]`), rounded, bordered, shadow.
  - **Top bar** (flex, border-b): title “Planning cockpit”, Live badge, “Scanned &lt;time&gt;”, Refresh. No breadcrumbs; one level.
  - **Tab strip**: Horizontal `TabsList` with 9 triggers (Dashboard, Reports, Tasks, Phases, Questions, State, Agents, Terminal, Chat). One row; no nested tabs at this level.
  - **Content area**: One pane per tab; `TabsContent` fills remaining height, scrolls internally. No secondary sidebar; no persistent side panels except when Chat has pending edits (then split: Chat | Review).
- **Chat tab**:
  - No edits: Single column = thread (viewport) + Plan/QuestionFlow blocks when present + composer (fixed bottom).
  - With edits: Horizontal split = Chat (flex-[2]) | Review (flex-[3]). Review has its own header (Summary/Code tabs, Apply/Reject) and file list + split diff.
- **Edit review**: Header (Summary | Code, Reject, Apply all) → body = [optional file list 48px] | content (summary text or split diff + editable right pane). No modal; inline in the Chat tab.

**Summary**: One main card, one tab strip, one content pane per tab. Split only in Chat when there are pending edits. No popovers/modals for primary content.

---

## 2. Reusability

- **Shared**: `planning-status.ts` exports `statusVariant()` and `statusClassName()`. Use for any task/phase/agent status badge so colors stay consistent. Reuse `Card`, `Badge`, `Tabs`, `ScrollArea`, `Button`, `Input` from `@/components/ui`.
- **Planning-specific**: `PlanningCockpit`, `PlanningChatPanel`, `PlanningEditReview` are planning-only. `Plan`, `ProgressTracker` from tool-ui are generic and reused.
- **Not reused elsewhere yet**: Dashboard metric cards, State block, and Terminal block are inline in the cockpit. If we add “KPIs” or “Requirements” views, we should extract shared list/card patterns (e.g. a `PlanningMetricCard` or `PlanningStatusBlock`) and keep status colors via `planning-status.ts`.

---

## 3. Color context and coding

**Semantic status colors** (from `planning-status.ts`):

| Meaning        | Statuses (lowercase)                    | Badge variant | Tint classes (optional)                    |
|----------------|------------------------------------------|---------------|--------------------------------------------|
| Done / success | done, complete, completed, resolved, applied | default       | emerald border/bg/text                     |
| In progress    | in-progress, in_progress, active        | secondary     | amber border/bg/text                       |
| Failed / bad   | failed, cancelled                        | destructive   | red border/bg/text                         |
| Pending / neutral | planned, open, suggested, etc.       | outline       | (none; use theme muted)                    |

**Where applied**: Tasks table (status column), Phases (ProgressTracker maps phase status), Agents (agent status and task status in cards). State tab and Questions list do not use status badges; they use muted text and secondary badges for IDs.

**Context-specific tints** (by view):

- **Tasks**: Status column = status color; phase/agent = muted. No separate “task-only” palette.
- **Phases**: ProgressTracker uses its own step status (pending / in-progress / completed / failed). We map phase status into that; no extra planning-specific color.
- **Diff (edit review)**: Left pane removals = red tint; right pane additions = emerald tint. Line number gutters use same tints. Matches VSCode/GitHub.
- **Terminal**: Output = green-300 on dark (bg-black/80); stderr = amber-400. No semantic status beyond success/warning.
- **Dashboard**: Cards use `border-border/50 bg-muted/20`; titles `text-muted-foreground`; values `text-foreground`. Charts use `--chart-1`, `--primary` (no status-based colors).
- **Repo root / requirements / KPIs / AI**: Not yet separate views. When added, keep status colors for “state” (e.g. requirement status, KPI trend) via `statusVariant`/`statusClassName` or a small extension in `planning-status.ts` (e.g. “positive/negative” for KPIs).

**Neutral palette**: `foreground`, `muted-foreground`, `border`, `border/50`, `muted/10`, `muted/20`, `muted/30`, `background`, `card`. Used for structure, labels, and non-status content.

---

## 4. Icons

**Cockpit tab strip** (lucide-react, `size-3.5`):

| Tab        | Icon          | Role                |
|-----------|---------------|---------------------|
| Dashboard | BarChart3      | Metrics / overview   |
| Reports   | FileText       | Documents            |
| Tasks     | ListTodo       | Checklist            |
| Phases    | LayoutGrid     | Structure / phases   |
| Questions | HelpCircle     | Open questions      |
| State     | Activity       | Current state        |
| Agents    | Users          | People / agents      |
| Terminal  | Terminal       | CLI                  |
| Chat      | MessageCircle  | Conversation / AI   |

**Shell sidebar** (planning link): ClipboardList (from earlier spec). Other app sections use ChartNoAxesCombined, Compass, Cuboid, Beaker, Package, Layers.

**Edit review**: FileText (Summary), FileCode (Code). File list uses path + +/- badges (no icon per file).

**Consistency**: One icon per tab/section; same size in tab strip. No icon-only tabs; label always present.

---

## 5. Modals and popups

- **No modals** for main flows: Dashboard, Reports, Tasks, Phases, Questions, State, Agents, Terminal, Chat, and the edit-review (Summary/Code, Apply/Reject) are all inline. No Dialog/Sheet for primary content.
- **Codex auth**: `CodexAuthControl` uses a **dropdown-style panel** (absolute, right of the icon) for login/verify/disconnect. It’s the only “popup” in the planning context.
- **Recommendation**: Prefer inline expansion (e.g. collapsible sections, extra tab) over modals for planning. If we add “view full report” or “view file,” consider a side panel or a new tab rather than a modal.

---

## 6. Compactness

- **Dense but readable**: Small type where appropriate (`text-xs`, `text-[10px]` for labels and IDs); `py-2`/`px-3` for table cells and list items. No large padding blocks.
- **Tab triggers**: Short labels, icon + text, `text-xs`, `h-9`. TabsList doesn’t wrap; horizontal scroll if needed.
- **Dashboard**: 4 metric cards in a grid (2x2 on small, 4 columns on large); charts at fixed heights (220px, 180px). No wasted space.
- **Tasks**: Table with 5 columns; goal column truncates with title tooltip. Single-row per task.
- **State**: Key-value list, mono, one line per field. Compact.
- **Terminal**: Input row + scrollable output; output uses `text-[11px]`.
- **Chat**: Thread and composer; Plan/QuestionFlow blocks are full-width sections, not modal-sized. With edits, split is 40/60.
- **Edit review**: File list 192px (w-48); Summary/Code content uses remaining space. Diff panes share width 50/50.

**Not compact**: Reports tab is a single ScrollArea with prose; readability over density. Phases use full ProgressTracker (default tool-ui density).

---

## 7. Grouping and tabbed panels

- **Top level**: One tab strip for the 9 views. No nested tabs in Dashboard, Tasks, Phases, Questions, State, Agents, or Terminal.
- **Edit review** (inside Chat when there are edits): **One** inner tab set = Summary | Code. So we have “tabs within a tab” only there. Summary = friendly list; Code = file list + split diff. Actions (Reject, Apply all) live in the same header as the Summary/Code tabs.
- **Dashboard**: Content is grouped by section (metrics cards → completion chart → usage chart), not by tabs. Same for Tasks (one table), Phases (one ProgressTracker), State (one block), etc.
- **Recommendation**: Keep one primary tab strip for “where I am” (Dashboard vs Tasks vs …). Use a second tab set only for alternate views of the same data (e.g. Summary vs Code in edit review). Avoid three levels of tabs.

---

## 8. Quick reference

| Concern        | Current choice                                                                 |
|----------------|---------------------------------------------------------------------------------|
| Layout shape   | One card → one tab strip → one content pane; split only Chat \| Review when edits exist. |
| Reuse          | `planning-status.ts` for status colors; UI primitives from `@/components/ui` and tool-ui. |
| Status colors  | Emerald = done; amber = in progress; red = failed; outline = pending.          |
| Icons          | One lucide icon per tab (BarChart3, FileText, ListTodo, LayoutGrid, HelpCircle, Activity, Users, Terminal, MessageCircle). |
| Modals         | None for planning content; only Codex auth panel.                              |
| Compactness    | Dense tables/lists (xs/10px); charts fixed height; terminal small type.        |
| Nested tabs    | Only in edit review: Summary \| Code.                                          |
