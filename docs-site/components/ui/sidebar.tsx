"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { PanelLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SidebarContextValue = {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("Sidebar components must be used inside SidebarProvider.");
  }
  return context;
}

function SidebarProvider({
  children,
  defaultCollapsed = false,
}: React.PropsWithChildren<{ defaultCollapsed?: boolean }>) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="flex min-h-dvh w-full">{children}</div>
    </SidebarContext.Provider>
  );
}

function Sidebar({ className, ...props }: React.ComponentProps<"aside">) {
  const { collapsed } = useSidebar();
  return (
    <aside
      data-slot="sidebar"
      className={cn(
        "border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-16" : "w-72",
        className,
      )}
      {...props}
    />
  );
}

function SidebarTrigger({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { collapsed, setCollapsed } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("size-8", className)}
      onClick={() => setCollapsed((prev) => !prev)}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      {...props}
    >
      <PanelLeftIcon className="size-4" />
    </Button>
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex h-full flex-col gap-2 overflow-y-auto p-3", className)} {...props} />;
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("space-y-2", className)} {...props} />;
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  const { collapsed } = useSidebar();
  return (
    <div className={cn("px-2 text-[11px] uppercase tracking-wide text-sidebar-foreground/70", className)} {...props}>
      {collapsed ? "..." : props.children}
    </div>
  );
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("space-y-1", className)} {...props} />;
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("space-y-1", className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("relative", className)} {...props} />;
}

function SidebarMenuButton({
  asChild,
  className,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  const { collapsed } = useSidebar();
  return (
    <Comp
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
        className,
      )}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
};
