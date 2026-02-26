"use client";

import { useRowLabel } from "@payloadcms/ui";

type RowData = { key?: string };
export function EnvVariableRowLabel() {
	const { data } = useRowLabel<RowData>();
	const key = data?.key?.trim();
	return (
		<span className="row-label" style={{ pointerEvents: "none" }}>
			{key || "New"}
		</span>
	);
}
