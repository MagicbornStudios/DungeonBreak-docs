"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MutableRefObject, ReactNode } from "react";
import {
  BeakerIcon,
  ChartNoAxesCombinedIcon,
  ClipboardListIcon,
  CompassIcon,
  CuboidIcon,
  GithubIcon,
  LayersIcon,
  PackageIcon,
} from "lucide-react";
import { small, useAsciiText } from "react-ascii-text";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CodexAuthControl } from "@/components/app-content/codex-auth-control";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const SECTIONS = [
  { href: "/dungeonbreak-content-app", label: "Overview", icon: ChartNoAxesCombinedIcon },
  { href: "/dungeonbreak-content-app/planning", label: "Planning", icon: ClipboardListIcon },
  { href: "/dungeonbreak-content-app/space-explorer", label: "Space Explorer", icon: CompassIcon },
  { href: "/dungeonbreak-content-app/dungeon-explorer", label: "Dungeon Explorer", icon: CuboidIcon },
  { href: "/dungeonbreak-content-app/game-value", label: "Game Value", icon: BeakerIcon },
  { href: "/dungeonbreak-content-app/content", label: "Content Packs", icon: PackageIcon },
  { href: "/dungeonbreak-content-app/migrations", label: "Migrations", icon: LayersIcon },
];

type AppDashboardShellProps = {
  children: ReactNode;
};

export function AppDashboardShell({ children }: AppDashboardShellProps) {
  const pathname = usePathname();
  const headerAsciiTextRef = useAsciiText({
    text: "DungeonBreak",
    font: small,
    isAnimated: false,
  });
  const sidebarAsciiTextRef = useAsciiText({
    text: "DungeonBreak",
    font: small,
    isAnimated: false,
  });

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <div className="overflow-hidden rounded-md border border-border/60 bg-sidebar-accent/20 px-2 py-2">
            <pre
              ref={sidebarAsciiTextRef as MutableRefObject<HTMLPreElement | null>}
              aria-label="DungeonBreak sidebar logo"
              className="m-0 whitespace-pre text-[7px] leading-[1.05] text-white"
            />
          </div>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {SECTIONS.map((item) => {
                  const active = pathname === item.href || (item.href !== "/dungeonbreak-content-app" && pathname.startsWith(item.href + "/"));

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        className={cn(active && "bg-sidebar-accent text-sidebar-accent-foreground")}
                      >
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <div className="flex min-h-dvh flex-1 flex-col bg-black">
        <header className="sticky top-0 z-50 border-b border-border bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/85">
          <div className="flex h-14 items-center gap-2 px-3">
            <SidebarTrigger className="[&_svg]:size-5" />
            <Separator orientation="vertical" className="h-4" />
            <pre
              ref={headerAsciiTextRef as MutableRefObject<HTMLPreElement | null>}
              aria-label="DungeonBreak"
              className="m-0 whitespace-pre text-[8px] leading-[1.05] text-white"
            />
            <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
              <CodexAuthControl />
              <Button asChild variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                <a href="https://github.com/MagicbornStudios/DungeonBreak-docs" target="_blank" rel="noreferrer">
                  <GithubIcon className="size-4" />
                  <span className="sr-only">Open repo</span>
                </a>
              </Button>
              <span className="hidden sm:inline">Math-first workspace</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-3 md:p-4">{children}</main>
      </div>
    </SidebarProvider>
  );
}
