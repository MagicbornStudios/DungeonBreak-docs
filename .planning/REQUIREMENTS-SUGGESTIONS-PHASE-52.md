# REQUIREMENTS Suggestions (Phase 52)

1. Add explicit Unreal DLC delivery contract requirements:
- Versioned pack manifest schema.
- Compatibility matrix (`content-schema version` x `plugin version` x `runtime version`).
- Integrity/signature verification and rollback behavior.

2. Add schema/asset alignment requirements:
- Deterministic mapping rules from Space Explorer/content editor outputs to Unreal plugin ingestion DTOs.
- Migration validation across model inheritance, canonical asset refs, and stat/vector schema changes.

3. Add secure secret handling requirements:
- Encrypted serialized env artifacts for cross-repo workflows.
- Local/CI-only decryption with key-rotation policy.
- No plaintext secret files in source control.

4. Add pipeline robustness requirements:
- Build/sign/publish/import smoke gates.
- Artifact provenance (build ID, source commit, manifest hash).
- Observability for download/import failures.

5. Add Supabase-backed distribution requirements:
- Define Supabase Storage bucket and object-key conventions for packs/manifests/reports.
- Require immutable version indexing plus latest pointer semantics.
- Require signed download URL policy, retention policy, and download audit events.

6. Add Dolt role clarity requirements:
- Dolt is optional for authoring/build-time patch history and merge workflows.
- Runtime/plugin download flow must not require Dolt connectivity.
- Build pipeline must emit identical bundle artifacts whether patch input came from Dolt or JSON inbox sources.
