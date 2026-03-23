export function statusClass(status: string): string {
  const s = status.toLowerCase();
  if (["pass", "passed", "ok", "success", "expected"].includes(s)) {
    return "status-ok";
  }
  if (["fail", "failed", "error", "unexpected"].includes(s)) {
    return "status-bad";
  }
  return "status-warn";
}
