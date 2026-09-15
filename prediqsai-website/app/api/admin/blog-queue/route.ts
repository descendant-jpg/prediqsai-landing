import { NextResponse } from "next/server";

export const runtime = "nodejs";

const apiOrigin = (
  process.env.API_ORIGIN ??
  (process.env.VERCEL ? "https://api.prediqsai.com" : "http://localhost:8080")
).replace(/\/$/, "");

async function verifyAdmin(request: Request): Promise<NextResponse | string> {
  const token = request.headers.get("authorization");
  if (!token?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Sign in as an admin to manage blog topics." }, { status: 401 });
  }
  const response = await fetch(`${apiOrigin}/api/user/me`, {
    headers: { Authorization: token },
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Your session could not be verified." }, { status: 401 });
  const user = await response.json() as { isAdmin?: boolean };
  return user.isAdmin ? token : NextResponse.json({ error: "Admin access required." }, { status: 403 });
}

export async function POST(request: Request) {
  const access = await verifyAdmin(request);
  if (access instanceof NextResponse) return access;
  const body: unknown = await request.json().catch(() => null);
  const response = await fetch(`${apiOrigin}/api/admin/blog-queue`, {
    method: "POST",
    headers: { Authorization: access, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({ error: "Blog queue request failed." }));
  return NextResponse.json(payload, { status: response.status });
}