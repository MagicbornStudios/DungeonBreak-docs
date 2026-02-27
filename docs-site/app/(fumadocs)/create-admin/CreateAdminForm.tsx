"use client";

import { useState } from "react";
import Link from "next/link";

export function CreateAdminForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const res = await fetch("/api/dev-create-admin", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password, name }),
				redirect: "manual",
			});
			if (res.status === 302 || res.type === "opaqueredirect") {
				const location = res.headers.get("Location");
				if (location) {
					window.location.href = location;
					return;
				}
			}
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as { error?: string };
				setError(data.error ?? `Request failed (${res.status})`);
				return;
			}
			window.location.href = "/admin";
		} catch (err) {
			setError(err instanceof Error ? err.message : "Request failed");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="mx-auto max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
			<h1 className="mb-4 text-xl font-semibold">Create admin account</h1>
			<p className="mb-4 text-sm text-muted-foreground">
				Dev only. Creates an owner account and logs you in.
			</p>
			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				<div>
					<label htmlFor="name" className="mb-1 block text-sm font-medium">
						Name
					</label>
					<input
						id="name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
						className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					/>
				</div>
				<div>
					<label htmlFor="email" className="mb-1 block text-sm font-medium">
						Email
					</label>
					<input
						id="email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					/>
				</div>
				<div>
					<label htmlFor="password" className="mb-1 block text-sm font-medium">
						Password
					</label>
					<input
						id="password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
					/>
				</div>
				{error && (
					<p className="text-sm text-destructive" role="alert">
						{error}
					</p>
				)}
				<button
					type="submit"
					disabled={loading}
					className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
				>
					{loading ? "Creating…" : "Create admin account"}
				</button>
			</form>
			<p className="mt-4 text-center text-sm text-muted-foreground">
				<Link href="/admin" className="underline hover:text-foreground">
					I already have an account
				</Link>
			</p>
		</div>
	);
}
