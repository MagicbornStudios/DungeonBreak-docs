"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { SpaceExplorer } from "@/components/reports/space-explorer";

export default function SpaceExplorerPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b bg-muted/30 px-6 py-4">
        <Link href="/play/reports" className="text-primary hover:underline">
          ← Reports
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Space Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Trait, skill, dialogue, and archetype spaces. Adjust sliders to move the player; view KNN and options.
        </p>
      </header>
      <SpaceExplorer />
    </main>
  );
}
