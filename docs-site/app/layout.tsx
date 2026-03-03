import type { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
  title: "DungeonBreak",
  description: "DungeonBreak Content App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-black font-mono text-foreground">{children}</body>
    </html>
  );
}
