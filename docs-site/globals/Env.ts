import type { GlobalConfig } from "payload";
import { isOwnerOrAdminUser } from "@/lib/access";

type EnvVarLegacy = {
	key: string;
	value?: string;
	environment?: string;
};
type EnvVarNew = {
	key: string;
	value?: string;
	envAll?: boolean;
	envDevelopment?: boolean;
	envProduction?: boolean;
	envStaging?: boolean;
};

export const Env: GlobalConfig = {
	slug: "env",
	label: "API Keys / .env",
	access: {
		read: ({ req: { user } }) => Boolean(isOwnerOrAdminUser(user)),
		update: ({ req: { user } }) => Boolean(isOwnerOrAdminUser(user)),
	},
	fields: [
		{
			type: "ui",
			name: "connectionsStatus",
			label: "Connections",
			admin: {
				components: {
					Field: "@/components/admin/ConnectionsStatus#ConnectionsStatus",
				},
			},
		},
		{
			type: "ui",
			name: "envCompare",
			label: ".env comparison",
			admin: {
				components: {
					Field: "@/components/admin/EnvCompareTable#EnvCompareTable",
				},
			},
		},
		{
			type: "ui",
			name: "envPaste",
			label: "Import .env",
			admin: {
				components: {
					Field: "@/components/PasteEnvField#PasteEnvField",
				},
			},
		},
		{
			name: "variables",
			type: "array",
			label: "Environment variables",
			admin: {
				description: "Key-value pairs. Use Import .env above to paste and parse.",
				components: {
					RowLabel: "@/components/EnvVariableRowLabel#EnvVariableRowLabel",
				},
				initCollapsed: false,
			},
			labels: { singular: "Variable", plural: "Variables" },
			fields: [
				{
					type: "row",
					fields: [
						{
							name: "envAll",
							type: "checkbox",
							label: "All",
							defaultValue: true,
							admin: { width: "25%" },
						},
						{
							name: "envDevelopment",
							type: "checkbox",
							label: "Development",
							defaultValue: false,
							admin: { width: "25%" },
						},
						{
							name: "envProduction",
							type: "checkbox",
							label: "Production",
							defaultValue: false,
							admin: { width: "25%" },
						},
						{
							name: "envStaging",
							type: "checkbox",
							label: "Staging",
							defaultValue: false,
							admin: { width: "25%" },
						},
					],
				},
				{
					type: "row",
					fields: [
						{
							name: "key",
							type: "text",
							label: "Key",
							required: true,
							admin: { width: "50%" },
						},
						{
							name: "value",
							type: "text",
							label: "Value",
							admin: { width: "50%" },
						},
					],
				},
			],
		},
		{
			name: "envContent",
			type: "textarea",
			label: "Raw .env (legacy)",
			admin: { hidden: true },
		},
	],
	hooks: {
		afterRead: [
			async ({ doc, req }) => {
				const data = doc as {
					envContent?: string | null;
					variables?: (EnvVarLegacy | EnvVarNew)[];
				};
				if (
					data.envContent &&
					(!data.variables || data.variables.length === 0)
				) {
					const lines = data.envContent
						.split(/\r?\n/)
						.map((l) => l.trim())
						.filter((l) => l && !l.startsWith("#"));
					const variables: EnvVarNew[] = lines.map((line) => {
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
					if (variables.length > 0) {
						await req.payload.updateGlobal({
							slug: "env",
							data: { variables, envContent: null },
						});
						(data as Record<string, unknown>).variables = variables;
						(data as Record<string, unknown>).envContent = null;
					}
				}
				// Migrate old single environment to checkboxes
				if (data.variables?.length) {
					const needsMigration = data.variables.some(
						(v) => "environment" in v && v.environment != null
					);
					if (needsMigration) {
						const migrated: EnvVarNew[] = data.variables.map(
							(v: EnvVarLegacy | EnvVarNew) => {
								if ("environment" in v && v.environment != null) {
									const env = v.environment;
									return {
										key: v.key,
										value: v.value,
										envAll: env === "all",
										envDevelopment: env === "development",
										envProduction: env === "production",
										envStaging: env === "staging",
									};
								}
								return v as EnvVarNew;
							}
						);
						await req.payload.updateGlobal({
							slug: "env",
							data: { variables: migrated },
						});
						(data as Record<string, unknown>).variables = migrated;
					}
				}
			},
		],
	},
};
