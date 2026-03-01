import { type NextRequest, NextResponse } from "next/server";

export const revalidate = false;

export async function GET(
  _req: NextRequest,
  _context: { params: Promise<{ slug?: string[] }> },
) {
  return new NextResponse("Not found", { status: 404 });
}

export async function generateStaticParams() {
  return [];
}
