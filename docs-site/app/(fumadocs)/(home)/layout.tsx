import type { ReactNode } from "react";
import { DocsRouteLayout } from "@/components/docs-route-layout";

export default async function Layout({ children }: { children: ReactNode }) {
	return <DocsRouteLayout>{children}</DocsRouteLayout>;
}
