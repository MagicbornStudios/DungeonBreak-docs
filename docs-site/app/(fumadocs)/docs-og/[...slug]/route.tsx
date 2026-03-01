export const runtime = "nodejs";
export const revalidate = false;

export async function GET(
  _req: Request,
  _context: { params: Promise<{ slug?: string[] }> },
) {
  return new Response("Not found", { status: 404 });
}

export async function generateStaticParams() {
  return [];
}
