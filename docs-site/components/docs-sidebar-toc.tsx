"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type DocsTocItem = { title: string; url: string; depth: number };

const DOCS_PREFIX = "/docs/";

export function DocsSidebarToc() {
	const pathname = usePathname();
	const [toc, setToc] = useState<DocsTocItem[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!pathname?.startsWith(DOCS_PREFIX)) {
			setToc([]);
			return;
		}
		const pathAfterDocs = pathname.slice(DOCS_PREFIX.length).replace(/\/$/, "");
		if (!pathAfterDocs) {
			setToc([]);
			return;
		}
		const slug = pathAfterDocs.split("/").filter(Boolean);
		setLoading(true);
		fetch(`/api/docs-toc?slug=${encodeURIComponent(slug.join(","))}`)
			.then((res) => res.json())
			.then((data: { toc: DocsTocItem[] }) => {
				setToc(Array.isArray(data.toc) ? data.toc : []);
			})
			.catch(() => setToc([]))
			.finally(() => setLoading(false));
	}, [pathname]);

	if (toc.length === 0 && !loading) return null;

	return (
		<div className="mt-4 border-t border-fd-border pt-4">
			<p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground">
				On this page
			</p>
			{loading ? (
				<div className="animate-pulse space-y-2 px-2">
					<div className="h-4 rounded bg-fd-muted/50" />
					<div className="h-4 w-4/5 rounded bg-fd-muted/50" />
					<div className="h-4 w-3/5 rounded bg-fd-muted/50" />
				</div>
			) : (
				<nav className="space-y-0.5" aria-label="On this page">
					{toc.map((item) => {
						const title =
							typeof item.title === "string" ? item.title : "Section";
						return (
							<Link
								key={item.url + title}
								href={pathname + item.url}
								className={cn(
									"block rounded-lg px-2 py-1.5 text-sm text-fd-muted-foreground transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80",
									"data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary"
								)}
								style={{
									paddingInlineStart: `calc(${2 + 2 * (item.depth - 1)} * var(--spacing))`,
								}}
							>
								{title || "Section"}
							</Link>
						);
					})}
				</nav>
			)}
		</div>
	);
}
