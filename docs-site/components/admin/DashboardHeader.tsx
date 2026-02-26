"use client";

import { Button } from "@payloadcms/ui";
import { Home } from "lucide-react";
import Link from "next/link";
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
	localDbFile?: { present: boolean };
};

function StatusPill({
	label,
	ok,
	title,
}: { label: string; ok: boolean; title?: string }) {
	return (
		<span
			title={title}
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: "0.35rem",
				fontSize: "12px",
				color: "var(--theme-elevation-700)",
			}}
		>
			<span
				style={{
					width: 6,
					height: 6,
					borderRadius: "50%",
					backgroundColor: ok ? "var(--theme-success-500)" : "var(--theme-error-500)",
				}}
			/>
			{label}
		</span>
	);
}

export function DashboardHeader() {
	const [status, setStatus] = useState<StatusData | null>(null);
	const [loading, setLoading] = useState(true);
	const [pushLoading, setPushLoading] = useState(false);
	const [pushResult, setPushResult] = useState<{
		ok: boolean;
		counts?: Record<string, number>;
		error?: string;
	} | null>(null);

	const fetchStatus = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/status", { credentials: "include" });
			if (res.ok) {
				const data = await res.json();
				setStatus(data);
			} else {
				setStatus(null);
			}
		} catch {
			setStatus(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchStatus();
	}, [fetchStatus]);

	const handlePush = useCallback(async () => {
		setPushLoading(true);
		setPushResult(null);
		try {
			const res = await fetch("/api/admin/push-local-to-supabase", {
				method: "POST",
				credentials: "include",
			});
			const data = await res.json();
			setPushResult(data);
			if (data.ok) fetchStatus();
		} catch (err) {
			setPushResult({
				ok: false,
				error: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setPushLoading(false);
		}
	}, [fetchStatus]);

	const supabaseOk =
		status?.database?.label === "Supabase Postgres" &&
		status?.database?.status === "connected";
	const localDbOk = Boolean(status?.localDbFile?.present);
	const s3Ok = status?.storage?.status === "connected";
	const pushEnabled =
		localDbOk && supabaseOk && !pushLoading;

	if (loading && !status) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "0.5rem 1rem",
					backgroundColor: "var(--theme-elevation-50)",
					borderBottom: "1px solid var(--theme-elevation-150)",
					fontSize: "12px",
					color: "var(--theme-elevation-600)",
				}}
			>
				<Link
					href="/admin"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.35rem",
						color: "var(--theme-text)",
						textDecoration: "none",
					}}
				>
					<Home size={16} />
					<span>Dashboard</span>
				</Link>
				<span>Loading…</span>
			</div>
		);
	}

	if (!status) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "0.5rem 1rem",
					backgroundColor: "var(--theme-elevation-50)",
					borderBottom: "1px solid var(--theme-elevation-150)",
					fontSize: "12px",
					color: "var(--theme-elevation-600)",
				}}
			>
				<Link
					href="/admin"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.35rem",
						color: "var(--theme-text)",
						textDecoration: "none",
					}}
				>
					<Home size={16} />
					<span>Dashboard</span>
				</Link>
				<span>Log in to see status</span>
			</div>
		);
	}

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				flexWrap: "wrap",
				gap: "0.5rem",
				padding: "0.5rem 1rem",
				backgroundColor: "var(--theme-elevation-50)",
				borderBottom: "1px solid var(--theme-elevation-150)",
			}}
		>
			<Link
				href="/admin"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "0.35rem",
					color: "var(--theme-text)",
					textDecoration: "none",
					fontSize: "13px",
					fontWeight: 500,
				}}
			>
				<Home size={16} />
				<span>Dashboard</span>
			</Link>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "1rem",
					flexWrap: "wrap",
				}}
			>
				<StatusPill
					label="Supabase"
					ok={supabaseOk}
					title={status.database?.message}
				/>
				<StatusPill
					label="Local DB"
					ok={localDbOk}
					title={localDbOk ? "payload.db found" : "payload.db not found"}
				/>
				<StatusPill
					label="S3"
					ok={s3Ok}
					title={status.storage?.message}
				/>
				<Button
					buttonStyle="secondary"
					size="small"
					onClick={handlePush}
					disabled={!pushEnabled}
				>
					{pushLoading ? "Pushing…" : "Push local to Supabase"}
				</Button>
				{pushResult && (
					<span
						style={{
							fontSize: "12px",
							color: pushResult.ok
								? "var(--theme-success-500)"
								: "var(--theme-error-500)",
						}}
					>
						{pushResult.ok
							? `Done: ${Object.entries(pushResult.counts ?? {})
									.map(([k, v]) => `${k}: ${v}`)
									.join(", ")}`
							: pushResult.error}
					</span>
				)}
			</div>
		</div>
	);
}
