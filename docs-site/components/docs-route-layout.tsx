import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { baseOptions } from "@/app/(fumadocs)/layout.config";
import { DocsSidebarToc } from "@/components/docs-sidebar-toc";
import { getSource } from "@/lib/source";

export async function DocsRouteLayout({ children }: { children: ReactNode }) {
	const source = await getSource();
	const tree = source.pageTree;

	return (
		<div id="nd-docs-layout">
			<DocsLayout
				tree={tree}
				{...baseOptions}
				sidebar={{
					prefetch: false,
					footer: <DocsSidebarToc />,
				}}
			>
				{children}
			</DocsLayout>
		</div>
	);
}
