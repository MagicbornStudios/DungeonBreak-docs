import { getLines, subscribe } from "@planning/lib/planning-debug-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const existing = getLines();
      for (const line of existing) {
        controller.enqueue(encoder.encode(`event: line\ndata: ${JSON.stringify(line)}\n\n`));
      }
      controller.enqueue(encoder.encode("event: ready\ndata: {}\n\n"));
      const unsubscribe = subscribe((line: string) => {
        try {
          controller.enqueue(encoder.encode(`event: line\ndata: ${JSON.stringify(line)}\n\n`));
        } catch {
          // controller closed
        }
      });
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode("event: ping\ndata: {}\n\n"));
        } catch {
          cleanup();
        }
      }, 15000);
      const cleanup = () => {
        clearInterval(interval);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      request.signal?.addEventListener("abort", cleanup);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}
