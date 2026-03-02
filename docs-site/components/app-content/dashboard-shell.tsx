\"use client\";

import Link from \"next/link\";
import { usePathname } from \"next/navigation\";
import { BeakerIcon, ChartNoAxesCombinedIcon, CompassIcon, CuboidIcon, LayersIcon, PackageIcon } from \"lucide-react\";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AsciiLogo } from "@/components/ui/ascii-logo";

const SECTIONS = [
  { href: "/dungeonbreak-content-app", label: "Overview", icon: ChartNoAxesCombinedIcon },
  { href: "/dungeonbreak-content-app/space-explorer", label: "Space Explorer", icon: CompassIcon },
  { href: "/dungeonbreak-content-app/dungeon-explorer", label: "DungeonExplorer", icon: CuboidIcon },
  { href: "/dungeonbreak-content-app/game-value", label: "Game Value", icon: BeakerIcon },
  { href: "/dungeonbreak-content-app/content", label: "Content Packs", icon: PackageIcon },
  { href: "/dungeonbreak-content-app/migrations", label: "Migrations", icon: LayersIcon },
];

export function AppDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>DungeonBreakContentApp</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {SECTIONS.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild className={cn(active && "bg-sidebar-accent text-sidebar-accent-foreground")}>
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
        <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-2">
            <SidebarTrigger className="[&_svg]:size-5" />
            <Separator orientation="vertical" className="h-5" />
        <div className="flex flex-col gap-1">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">DungeonBreakContentApp</div>
          <AsciiLogo className="max-w-[240px]" />
        </div>
            <div className="ml-auto text-[11px] text-muted-foreground">Math-first dungeon authoring workspace</div>
          </div>
        </header>
        <main className="flex-1 p-4">{children}</main>
      </div>
    </SidebarProvider>
  );
}
