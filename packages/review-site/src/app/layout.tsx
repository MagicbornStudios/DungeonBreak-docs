import type { Metadata } from "next";
import type * as React from "react";
import LayoutShell from "@/components/LayoutShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "DungeonBreak — Review hub",
  description:
    "Static hub: game build, tests, guides, and bundled content summary.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
