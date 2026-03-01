"use client";

import Link from "next/link";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page";
import { SpaceExplorer } from "@/components/reports/space-explorer";

export default function SpaceExplorerPage() {
  return (
    <DocsPage
      footer={{ enabled: false }}
      tableOfContent={{ style: "normal", single: false }}
      toc={[
        { title: "Overview", url: "#overview", depth: 2 },
        { title: "Explorer", url: "#explorer", depth: 2 },
      ]}
    >
      <DocsTitle>Space Explorer</DocsTitle>
      <DocsDescription>
        Trait, skill, dialogue, and archetype spaces with slider-driven traversal.
      </DocsDescription>
      <DocsBody>
      <section id="overview" className="mb-4">
        <Link href="/play/reports" className="text-primary hover:underline">
          Reports
        </Link>
        <p className="text-sm text-muted-foreground">
          Trait, skill, dialogue, and archetype spaces. Adjust sliders to move the player; view KNN and options.
        </p>
      </section>
      <section id="explorer">
      <SpaceExplorer />
      </section>
      </DocsBody>
    </DocsPage>
  );
}
