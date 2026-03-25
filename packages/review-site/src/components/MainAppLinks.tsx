"use client";

/**
 * Outbound links to the main docs-site app (Payload, /play, asset explorer).
 * Set `NEXT_PUBLIC_MAIN_APP_URL` at build time (e.g. https://your-app.vercel.app).
 */
export function MainAppLinks() {
  const base = process.env.NEXT_PUBLIC_MAIN_APP_URL?.replace(/\/$/, "");
  if (!base) {
    return (
      <p className="text-muted-foreground text-xs">
        Set{" "}
        <code className="rounded bg-muted px-1 py-0.5">
          NEXT_PUBLIC_MAIN_APP_URL
        </code>{" "}
        when building to show links to the full game and asset explorer app.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <span className="text-muted-foreground text-xs uppercase tracking-wide">
        Main app
      </span>
      <a
        className="inline-flex items-center rounded-lg border border-border bg-background/60 px-3 py-1.5 text-foreground text-sm transition hover:border-primary/50 hover:bg-accent"
        href={`${base}/play`}
        rel="noopener noreferrer"
        target="_blank"
      >
        Browser game /play
      </a>
      <a
        className="inline-flex items-center rounded-lg border border-border bg-background/60 px-3 py-1.5 text-foreground text-sm transition hover:border-primary/50 hover:bg-accent"
        href={`${base}/dungeonbreak-content-app/asset-explorer`}
        rel="noopener noreferrer"
        target="_blank"
      >
        Asset explorer
      </a>
    </div>
  );
}
