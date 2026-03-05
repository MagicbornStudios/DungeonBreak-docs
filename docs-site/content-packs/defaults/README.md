# Test-Mode Default Bundle

`default-content-pack.bundle.v1.sealed.json` is the encrypted default bundle used by Space Explorer in development test mode.

Update workflow:

1. Edit canonical bundle source at `public/game/content-pack.bundle.v1.json`.
2. Reseal with your current `PAYLOAD_SECRET`:

```bash
pnpm --dir docs-site run test-mode:seal-default
```

3. Commit the updated sealed file.

Notes:

- Decryption happens server-side via `/api/content-packs/test-mode-default`.
- Test mode is development-only.
