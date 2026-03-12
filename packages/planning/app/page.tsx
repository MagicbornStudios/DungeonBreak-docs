import { AppSidebar } from "@/planning-ui/app-sidebar";
import { PlanningDashboardContent } from "@/planning-ui/planning-dashboard-content";
import { SiteHeader } from "@/planning-ui/site-header";
import { SidebarInset, SidebarProvider } from "@/planning-ui/ui/sidebar";

export default function Page() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <PlanningDashboardContent />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
