import type { ReactNode } from "react";
import { DocsRouteLayout } from "@/components/docs-route-layout";

export default async function PlanningLayout({ children }: { children: ReactNode }) {
	return <DocsRouteLayout>{children}</DocsRouteLayout>;
}

export const revalidate = 30;
