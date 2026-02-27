import { getPayload } from "payload";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import type { Media } from "@/payload-types";
import config from "@/payload.config";

export default async function HomePage() {
  const payloadConfig = await config;
  const payload = await getPayload({ config: payloadConfig });

  const { docs: categories } = await payload.find({
    collection: "categories",
    sort: "order",
    limit: 1000,
    depth: 1,
  });

  // Get the first doc for each category to link to
  const categoriesWithFirstDoc = await Promise.all(
    categories.map(async (category) => {
      const { docs: categoryDocs } = await payload.find({
        collection: "docs",
        where: {
          and: [
            {
              category: {
                equals: category.id,
              },
            },
            {
              or: [
                {
                  _status: {
                    equals: "published",
                  },
                },
                {
                  _status: {
                    exists: false,
                  },
                },
              ],
            },
          ],
        },
        sort: "order",
        limit: 1,
      });

      return {
        ...category,
        firstDoc: categoryDocs[0],
      };
    })
  );

  return (
    <main className="flex flex-1 flex-col px-4 py-4 md:px-8 md:py-16">
      <div className="mx-auto flex max-w-6xl flex-1 flex-col justify-center gap-4 text-center">
        <div className="mb-4 flex items-center justify-center gap-2 md:gap-4">
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-wide">
            DungeonBreak
          </h1>
        </div>
        <p className="mb-8 text-fd-muted-foreground text-md max-w-2xl mx-auto">
          Linear world, branching narrative RPG — emergent, system-driven. This
          site hosts docs, API references, and onboarding for the game and
          Narrative Engine.
        </p>
        <div className="mx-auto mb-6 w-full max-w-2xl">
          <Link href="/play" className="block">
              <Card className="border-primary/40 bg-primary/5 transition-all hover:border-primary hover:shadow-xl">
              <CardHeader>
                <CardTitle>Play Escape the Dungeon in Browser</CardTitle>
                <CardDescription>
                  Launch the 3-column playable run at <code>/play</code> with
                  click actions, live story feed, and browser autosave.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="flex w-full flex-col justify-center gap-4 md:flex-row md:flex-wrap md:gap-6">
              <Link href="/docs/getting-started/welcome" className="block w-full md:w-80">
                <Card className="transition-all hover:border-primary/50 hover:shadow-lg">
                  <CardHeader>
                    <CardTitle>Getting Started</CardTitle>
                    <CardDescription>
                      Intro to the project, API docs, and guides. Run npm run lab
                      first so API docs are generated.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              <Link href="/admin" className="block w-full md:w-80">
                <Card className="transition-all hover:border-primary/50 hover:shadow-lg">
                  <CardHeader>
                    <CardTitle>Admin</CardTitle>
                    <CardDescription>
                      Payload CMS admin for docs and game-data content.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center gap-4 md:flex-row md:flex-wrap md:gap-6">
            {categoriesWithFirstDoc.map((category) => {
              // Build the URL from category slug and first doc slug (getting-started has its own page)
              const href =
                category.slug === "getting-started"
                  ? "/docs/getting-started"
                  : category.firstDoc
                    ? `/docs/${category.slug}/${category.firstDoc.slug}`
                    : `/docs/${category.slug}`;

              // Get icon URL from media relationship
              const iconUrl =
                typeof category.icon === "object" &&
                category.icon !== null &&
                "url" in category.icon
                  ? (category.icon as Media).url
                  : null;

              return (
                <Link
                  key={category.id}
                  href={href}
                  className="block w-full md:w-80"
                >
                  <Card className="transition-all hover:border-primary/50 hover:shadow-lg">
                    <CardHeader>
                      {iconUrl ? (
                        <div className="mb-2">
                          <Image
                            alt={category.title}
                            className="object-contain"
                            height={32}
                            src={iconUrl}
                            width={32}
                          />
                        </div>
                      ) : null}
                      <CardTitle>{category.title}</CardTitle>
                      <CardDescription>
                        {category.description || ""}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <footer className="mt-16 py-6 text-center border-t border-fd-border">
        <p className="text-sm text-fd-muted-foreground">
          DungeonBreak — linear world, branching narrative RPG.
        </p>
      </footer>
    </main>
  );
}
