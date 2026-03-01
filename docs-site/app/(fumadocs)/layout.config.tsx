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
			<div className="flex items-center gap-2">
				<span className="font-bold font-serif tracking-wide">DungeonBreak</span>
			</div>
		),
	},
	links: [
		{
			text: "Home",
			url: "/",
			active: "url",
			icon: <Home />,
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
			text: "Game Value",
			url: "/play/reports/game-value",
			active: "url",
			icon: <Sparkles />,
		},
		{
			text: "Space Explorer",
			url: "/play/reports/spaces",
			active: "url",
		},
		{
			text: "Downloadables",
			url: "/play/downloads",
			active: "url",
			icon: <Download />,
		},
		{
			text: "Engine",
			url: "/docs/engine",
			active: "url",
			icon: <BookOpen />,
		},
		{
			text: "Formulas",
			url: "/docs/formulas",
			active: "url",
			icon: <FileText />,
		},
		{
			text: "Roadmap",
			url: "/planning/roadmap",
			active: "url",
			icon: <FileText />,
		},
		{
			text: "GRD",
			url: "/planning/grd",
			active: "url",
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
			text: "Game Value",
			url: "/play/reports/game-value",
			active: "url",
			icon: <Sparkles />,
		},
		{
			text: "Space Explorer",
			url: "/play/reports/spaces",
			active: "url",
		},
		{
			text: "Downloadables",
			url: "/play/downloads",
			active: "url",
		},
		{
			text: "Engine",
			url: "/docs/engine",
			active: "url",
		},
		{
			text: "Formulas",
			url: "/docs/formulas",
			active: "url",
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
		{
			text: "Admin",
			url: "/admin",
			active: "url",
			icon: <Settings />,
		},
	],
};
