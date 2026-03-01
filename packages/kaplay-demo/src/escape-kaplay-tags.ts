/**
 * Escape square brackets in text so Kaplay's styled text parser does not
 * interpret them as [style]...[/style] tags. Engine output (look, feed, etc.)
 * and UI strings with brackets (e.g. "[WASD] Move", room IDs) cause "unclosed tags" errors.
 *
 * Convention: Any string passed to k.text() that contains [ or ] must be wrapped
 * in escapeKaplayStyledText(). Static strings without brackets are safe.
 */
export function escapeKaplayStyledText(text: string): string {
  return text.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}
