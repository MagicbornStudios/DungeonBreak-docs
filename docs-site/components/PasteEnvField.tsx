"use client";

import { useField, Button } from "@payloadcms/ui";
import { useCallback, useState } from "react";

type EnvVariable = {
	key: string;
	value?: string;
	envAll?: boolean;
	envDevelopment?: boolean;
	envProduction?: boolean;
	envStaging?: boolean;
};

function parseEnvContent(text: string): EnvVariable[] {
	return text
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith("#"))
		.map((line) => {
			const eq = line.indexOf("=");
			const key = eq >= 0 ? line.slice(0, eq).trim() : line;
			let value = eq >= 0 ? line.slice(eq + 1).trim() : "";
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			return {
				key,
				value,
				envAll: true,
				envDevelopment: false,
				envProduction: false,
				envStaging: false,
			};
		});
}

export function PasteEnvField() {
	const { value, setValue } = useField<EnvVariable[]>({ path: "variables" });
	const [pasteText, setPasteText] = useState("");

	const handleParse = useCallback(() => {
		const parsed = parseEnvContent(pasteText);
		if (parsed.length === 0) return;
		const current = Array.isArray(value) ? value : [];
		setValue([...current, ...parsed]);
		setPasteText("");
	}, [pasteText, value, setValue]);

	return (
		<div style={{ marginBottom: "1rem" }}>
			<textarea
				placeholder="Paste .env contents here (KEY=VALUE per line)"
				value={pasteText}
				onChange={(e) => setPasteText(e.target.value)}
				rows={4}
				style={{
					width: "100%",
					padding: "0.5rem",
					fontFamily: "monospace",
					fontSize: "13px",
					border: "1px solid var(--theme-elevation-150)",
					borderRadius: "4px",
					backgroundColor: "var(--theme-elevation-50)",
					color: "var(--theme-elevation-900)",
					resize: "vertical",
				}}
			/>
			<Button
				buttonStyle="secondary"
				size="small"
				onClick={handleParse}
				disabled={!pasteText.trim()}
			>
				Parse and add
			</Button>
		</div>
	);
}
