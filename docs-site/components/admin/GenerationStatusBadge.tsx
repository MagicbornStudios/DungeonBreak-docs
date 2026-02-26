"use client";

import { useField } from "@payloadcms/ui";

const STATUS_COLORS: Record<string, string> = {
  failed: "#dc2626",
  processing: "#2563eb",
  queued: "#f59e0b",
  succeeded: "#16a34a",
};

export function GenerationStatusBadge() {
  const { value } = useField<string>({ path: "status" });
  const status = typeof value === "string" ? value : "unknown";
  const color = STATUS_COLORS[status] || "#6b7280";

  return (
    <div style={{ alignItems: "center", display: "flex", gap: "0.5rem" }}>
      <span
        style={{
          backgroundColor: `${color}22`,
          border: `1px solid ${color}66`,
          borderRadius: 999,
          color,
          display: "inline-block",
          fontSize: 12,
          fontWeight: 600,
          padding: "4px 10px",
          textTransform: "capitalize",
        }}
      >
        {status}
      </span>
    </div>
  );
}
