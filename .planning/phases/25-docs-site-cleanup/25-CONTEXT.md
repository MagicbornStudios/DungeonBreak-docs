# Phase 25 Context: Docs-site Cleanup — Reports, Downloadables, Planning Docs

## Outcome

Docs site displays well: public gameplay reports, downloadable test artifacts, engine docs, and embedded planning docs (ROADMAP, GRD) in nav. Nav aligns with actual content.

## Constraints

- Another agent may be editing docs-site; avoid conflicting changes.
- Use existing fumadocs layout where possible.
- Planning docs rendered as read-only markdown (no MDX conversion).

## Non-goals

- Full MDX migration of .planning files.
- Payload CMS changes for planning content.

## DoD Signals

- Nav shows Play, Reports, Downloadables, Engine, Roadmap, GRD.
- `/planning/roadmap` and `/planning/grd` render .planning markdown.
- Downloadables page lists test reports and allows download.
- Engine docs page exists with overview and package pointer.
