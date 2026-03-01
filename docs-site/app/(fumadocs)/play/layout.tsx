import type { ReactNode } from "react";
import { DocsRouteLayout } from "@/components/docs-route-layout";

export default async function PlayLayout({ children }: { children: ReactNode }) {
	return <DocsRouteLayout>{children}</DocsRouteLayout>;
}

export const revalidate = 30;
