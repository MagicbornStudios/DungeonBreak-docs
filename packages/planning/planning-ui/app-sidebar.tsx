"use client"

import * as React from "react"

import { NavDocuments } from "@/planning-ui/nav-documents"
import { NavMain } from "@/planning-ui/nav-main"
import { NavSecondary } from "@/planning-ui/nav-secondary"
import { NavUser } from "@/planning-ui/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/planning-ui/ui/sidebar"
import { ChartBarIcon, CommandIcon, FileChartColumnIcon, FileIcon, FolderIcon, LayoutDashboardIcon, LayoutGridIcon, MessageCircleIcon, Settings2Icon, CircleHelpIcon, UsersIcon } from "lucide-react"

const data = {
  user: {
    name: "Planning",
    email: "",
    avatar: "",
  },
  navMain: [
    { title: "Overview", url: "/", icon: <LayoutDashboardIcon /> },
    { title: "Sprints", url: "/?tab=sprints", icon: <ChartBarIcon /> },
    { title: "Phases", url: "/?tab=phases", icon: <LayoutGridIcon /> },
    { title: "Agents", url: "/?tab=agents", icon: <UsersIcon /> },
    { title: "Reports", url: "/?tab=reports", icon: <FileChartColumnIcon /> },
  ],
  navClouds: [] as { title: string; icon: React.ReactNode; url: string; items: { title: string; url: string }[] }[],
  navSecondary: [
    { title: "Settings", url: "#", icon: <Settings2Icon /> },
    { title: "Help", url: "#", icon: <CircleHelpIcon /> },
  ],
  documents: [
    { name: "Codex / Assistant (floating chat)", url: "#", icon: <MessageCircleIcon /> },
    { name: "Planning folders (coming)", url: "#", icon: <FolderIcon /> },
  ],
}
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="/" />}
            >
              <CommandIcon className="size-5!" />
              <span className="text-base font-semibold">Planning</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
