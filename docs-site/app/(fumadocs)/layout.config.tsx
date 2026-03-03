import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import {
  BarChart3,
  BookOpen,
  Download,
  FileText,
  Home,
  Play,
  ScrollText,
  Settings,
  Sparkles,
} from "lucide-react";

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions: BaseLayoutProps = {
	themeSwitch: {
		enabled: true,
		mode: "light-dark-system",
	},
	nav: {
		title: (
			<div className="flex flex-col text-[10px] uppercase tracking-[0.3em]">
				<span className="font-mono text-fd-muted-foreground">DungeonBreak</span>
				<span className="text-[8px] text-fd-accent-foreground">Hilbert cube sandbox</span>
			</div>
		),
	},
	links: [
		{
			text: "App",
			url: "/dungeonbreak-content-app",
			active: "url",
			icon: <Sparkles />,
		},
		{
			text: "Admin",
			url: "/admin",
			active: "url",
			icon: <Settings />,
		},
	],
};

export const homeOptions: BaseLayoutProps = {
	...baseOptions,
	links: [
		{
			text: "Content App",
			url: "/dungeonbreak-content-app",
			active: "url",
		},
		{
			text: "Space Explorer",
			url: "/play/reports/spaces",
			active: "url",
		},
		{
			text: "Game Value",
			url: "/play/reports/game-value",
			active: "url",
			icon: <Sparkles />,
		},
		{
			text: "Play",
			url: "/play",
			active: "url",
			icon: <Play />,
		},
		{
			text: "Reports",
			url: "/play/reports",
			active: "url",
			icon: <BarChart3 />,
		},
		{
			text: "Downloads",
			url: "/play/downloads",
			active: "url",
			icon: <Download />,
		},
		{
			text: "Docs",
			url: "/docs",
			active: "url",
			icon: <BookOpen />,
		},
		{
			text: "Planning",
			url: "/planning",
			active: "url",
			icon: <FileText />,
		},
		{
			text: "Roadmap",
			url: "/planning/roadmap",
			active: "url",
		},
		{
			text: "GRD",
			url: "/planning/grd",
			active: "url",
			icon: <ScrollText />,
		},
	],
};
