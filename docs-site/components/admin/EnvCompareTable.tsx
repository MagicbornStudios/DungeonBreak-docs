"use client";

import { useCallback, useEffect, useState } from "react";

type CompareData = {
	expected: string[];
	optional?: string[];
	env: Record<string, boolean>;
};

export function EnvCompareTable() {
	const [data, setData] = useState<CompareData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchCompare = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/env/compare", { credentials: "include" });
			if (res.ok) {
				const json = await res.json();
				setData(json);
			} else {
				setError(res.status === 403 ? "Log in to see env comparison." : "Failed to load.");
				setData(null);
			}
		} catch {
			setError("Failed to load.");
			setData(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchCompare();
	}, [fetchCompare]);

	if (loading) {
		return (
			<div style={{ padding: "1rem 0", color: "var(--theme-elevation-600)", fontSize: "13px" }}>
				Loading env comparison…
			</div>
		);
	}

	if (error) {
		return (
			<div style={{ padding: "1rem 0", color: "var(--theme-elevation-600)", fontSize: "13px" }}>
				{error}
			</div>
		);
	}

	if (!data || (data.expected.length === 0 && (data.optional?.length ?? 0) === 0)) {
		return (
			<div style={{ padding: "1rem 0", color: "var(--theme-elevation-600)", fontSize: "13px" }}>
				No expected keys in .env.example.
			</div>
		);
	}

	const rows = [
		...data.expected.map((key) => ({ key, optional: false })),
		...(data.optional ?? []).map((key) => ({ key, optional: true })),
	];

	return (
		<div style={{ marginBottom: "1.5rem" }}>
			<h3 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>.env vs .env.example</h3>
			<div
				style={{
					overflowX: "auto",
					border: "1px solid var(--theme-elevation-150)",
					borderRadius: "6px",
					backgroundColor: "var(--theme-elevation-50)",
				}}
			>
				<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
					<thead>
						<tr>
							<th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--theme-elevation-150)" }}>
								Variable
							</th>
							<th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--theme-elevation-150)" }}>
								Set in env
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.map(({ key, optional }) => (
							<tr key={key}>
								<td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--theme-elevation-100)" }}>
									{key}
									{optional && (
										<span style={{ marginLeft: "0.25rem", color: "var(--theme-elevation-500)", fontSize: "12px" }}>
											(optional)
										</span>
									)}
								</td>
								<td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--theme-elevation-100)" }}>
									<span
										style={
											data.env[key]
												? { color: "var(--theme-success-500)" }
												: { color: "var(--theme-elevation-500)" }
										}
									>
										{data.env[key] ? "Yes" : "No"}
									</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
