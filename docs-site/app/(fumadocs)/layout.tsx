import "./global.css";
import "video.js/dist/video-js.css";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	metadataBase: new URL(
		process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
	),
	title: {
		default: "DungeonBreak Docs",
		template: "%s | DungeonBreak Docs",
	},
	description:
		"Docs and API for DungeonBreak — linear world, branching narrative RPG.",
	openGraph: {
		type: "website",
		locale: "en_US",
		siteName: "DungeonBreak Docs",
		title: "DungeonBreak Docs",
		description:
			"Docs and API for DungeonBreak — linear world, branching narrative RPG.",
	},
	twitter: {
		card: "summary_large_image",
		title: "DungeonBreak Docs",
		description:
			"Docs and API for DungeonBreak — linear world, branching narrative RPG.",
	},
};

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className="dark" suppressHydrationWarning>
			<body className="flex min-h-screen flex-col antialiased">
				<RootProvider theme={{ defaultTheme: "dark", forcedTheme: "dark" }}>
					{children}
				</RootProvider>
			</body>
		</html>
	);
}
