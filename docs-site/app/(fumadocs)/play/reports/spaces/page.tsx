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
      <DocsTitle>Content and Behavior Space Explorer</DocsTitle>
      <DocsDescription>
        Content vectors plus event/effect behavior similarity with runtime pack-driven space modeling.
      </DocsDescription>
      <DocsBody>
      <section id="overview" className="mb-4">
        <Link href="/play/reports" className="text-primary hover:underline">
          Reports
        </Link>
        <p className="text-sm text-muted-foreground">
          Navigate content vectors, event space, and effect behavior signatures. Adjust sliders to move the player and inspect nearest content, events, and effects.
        </p>
      </section>
      <section id="explorer">
      <SpaceExplorer />
      </section>
      </DocsBody>
    </DocsPage>
  );
}
