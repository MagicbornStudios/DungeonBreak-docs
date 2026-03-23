import Link from "next/link";
import { LockIcon, SparklesIcon } from "lucide-react";
import { allowedPortalEmails } from "@/lib/internal-portal-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type PortalAccessPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

function safeNextPath(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return "/dungeonbreak-content-app/asset-explorer";
  }
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dungeonbreak-content-app/asset-explorer";
  }
  return value;
}

export default async function PortalAccessPage({
  searchParams,
}: PortalAccessPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const nextPath = safeNextPath(params?.next);
  const errorMessage =
    typeof params?.error === "string" && params.error.trim().length > 0
      ? params.error
      : null;
  const portalEmails = allowedPortalEmails();

  return (
    <main className="min-h-dvh bg-black px-4 py-10 md:px-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70 bg-card/90 shadow-2xl shadow-black/40">
          <CardHeader className="space-y-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
              <LockIcon className="size-3.5" />
              Internal Portal Access
            </div>
            <CardTitle className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Sign in to the DungeonBreak asset portal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-muted-foreground">
            <p>
              This portal is restricted to the internal content-authoring team.
              Use your allowlisted email plus the temporary onboarding password
              to open Asset Explorer and the admin surface.
            </p>
            {errorMessage ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorMessage}
              </div>
            ) : null}
            <form
              action="/api/internal-auth/login"
              method="post"
              className="space-y-4"
            >
              <input type="hidden" name="next" value={nextPath} />
              <label className="block space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Allowlisted Email
                </div>
                <Input
                  required
                  autoComplete="email"
                  name="email"
                  placeholder={portalEmails[0] ?? "bg@dungeonbreak.com"}
                  type="email"
                />
              </label>
              <label className="block space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Onboarding Password
                </div>
                <Input
                  required
                  autoComplete="current-password"
                  name="password"
                  placeholder="stopthedungeonbreak"
                  type="password"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:from-purple-600 hover:to-indigo-700"
                  type="submit"
                >
                  <SparklesIcon className="size-4" />
                  Enter Asset Explorer
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link href="/">Back to site</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/70">
          <CardHeader>
            <CardTitle>Current Internal Mailboxes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="space-y-2">
              {portalEmails.map((email) => (
                <div
                  key={email}
                  className="rounded-lg border border-border bg-background/50 px-3 py-2 font-mono text-xs text-foreground"
                >
                  {email}
                </div>
              ))}
            </div>
            <p>
              This is intentionally temporary. The goal is to keep the portal
              private while the product is still focused on internal content,
              AI-assisted authoring, media generation, and publish flow work.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
