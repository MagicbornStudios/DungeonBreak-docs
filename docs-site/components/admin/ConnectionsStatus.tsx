"use client";

import { useCallback, useEffect, useState } from "react";

type CheckResult = {
	label: string;
	status: "connected" | "error";
	message?: string;
};

type StatusData = {
	database: CheckResult;
	storage: CheckResult;
	apiKeys: { key: string; set: boolean }[];
};

export function ConnectionsStatus() {
	const [status, setStatus] = useState<StatusData | null>(null);
	const [loading, setLoading] = useState(true);
	const [forbidden, setForbidden] = useState(false);

	const fetchStatus = useCallback(async () => {
		setLoading(true);
		setForbidden(false);
		try {
			const res = await fetch("/api/status", { credentials: "include" });
			if (res.ok) {
				const data = await res.json();
				setStatus(data);
			} else {
				setStatus(null);
				setForbidden(res.status === 403);
			}
		} catch {
			setStatus(null);
			setForbidden(false);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchStatus();
	}, [fetchStatus]);

	if (loading) {
		return (
			<div style={{ padding: "1rem 0", color: "var(--theme-elevation-600)" }}>
				Loading connection status…
			</div>
		);
	}

	if (!status) {
		return (
			<div style={{ padding: "1rem 0", color: "var(--theme-elevation-600)" }}>
				{forbidden
					? "Log in to see connection status and push options."
					: "Could not load status (admin only)."}
			</div>
		);
	}

	const badge = (check: CheckResult) =>
		check.status === "connected" ? (
			<span style={{ color: "var(--theme-success-500)", fontWeight: 600 }}>Connected</span>
		) : (
			<span style={{ color: "var(--theme-error-500)", fontWeight: 600 }}>Error</span>
		);

	return (
		<div style={{ marginBottom: "1.5rem" }}>
			<h3 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>Connections</h3>
			<div
				style={{
					display: "grid",
					gap: "0.5rem",
					padding: "1rem",
					backgroundColor: "var(--theme-elevation-50)",
					borderRadius: "6px",
					border: "1px solid var(--theme-elevation-150)",
				}}
			>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<span>{status.database.label}</span>
					{badge(status.database)}
				</div>
				{status.database.message && (
					<div style={{ fontSize: "12px", color: "var(--theme-elevation-600)" }}>
						{status.database.message}
					</div>
				)}
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<span>{status.storage.label}</span>
					{badge(status.storage)}
				</div>
				{status.storage.message && (
					<div style={{ fontSize: "12px", color: "var(--theme-elevation-600)" }}>
						{status.storage.message}
					</div>
				)}
				<div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid var(--theme-elevation-150)" }}>
					<div style={{ fontSize: "12px", marginBottom: "0.25rem" }}>API keys</div>
					{status.apiKeys.map(({ key, set }) => (
						<div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
							<span>{key}</span>
							<span style={set ? { color: "var(--theme-success-500)" } : { color: "var(--theme-elevation-500)" }}>
								{set ? "Set" : "Not set"}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
