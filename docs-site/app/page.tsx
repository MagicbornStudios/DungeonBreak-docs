import Link from "next/link";
import { ArrowRightIcon, BotIcon, BoxesIcon, ShieldIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SURFACES = [
  {
    icon: BoxesIcon,
    title: "Asset Explorer",
    description:
      "Author the live game schemas and canonical assets with analytical collection views.",
  },
  {
    icon: BotIcon,
    title: "Hosted AI",
    description:
      "Use the in-product assistant to plan, review, and update forms and assets without leaving the portal.",
  },
  {
    icon: ShieldIcon,
    title: "Internal Portal",
    description:
      "Keep publishing and admin operations behind the internal DungeonBreak workflow.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-dvh px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="overflow-hidden rounded-3xl border border-border/70 bg-card/85 p-6 shadow-2xl shadow-black/40 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-5">
              <span className="inline-flex rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                DungeonBreak Portal
              </span>
              <div className="space-y-3">
                <h1 className="max-w-3xl font-serif text-4xl font-bold tracking-tight text-foreground md:text-6xl">
                  Market the game. Author the content. Keep the asset pipeline
                  in one place.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                  The public docs product is being retired. This site is now the
                  DungeonBreak marketing surface plus the internal asset portal
                  for schemas, canonical data, AI-assisted authoring, and
                  content publishing.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:from-purple-600 hover:to-indigo-700"
                >
                  <Link href="/portal-access?next=%2Fdungeonbreak-content-app%2Fasset-explorer">
                    Enter Internal Portal
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-primary/30 bg-background/30"
                >
                  <Link href="/dungeonbreak-content-app/asset-explorer">
                    Asset Explorer Preview
                  </Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Current Direction
              </p>
              <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                <p>
                  Asset Explorer is the main product surface inside docs-site.
                </p>
                <p>
                  Space Explorer, planner cockpit, embedded game, and old report
                  surfaces are moving out of the app build.
                </p>
                <p>
                  The static review host remains separate for game/test
                  artifacts only.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {SURFACES.map((surface) => (
            <Card
              key={surface.title}
              className="border-0 bg-white/95 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl dark:bg-slate-900/80"
            >
              <CardHeader className="space-y-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg">
                  <surface.icon className="size-5" />
                </div>
                <CardTitle className="text-lg font-semibold tracking-tight">
                  {surface.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm leading-6 text-muted-foreground">
                {surface.description}
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
