import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const maxBytes = 3 * 1024 * 1024;
const validTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
const apiOrigin = (process.env.API_ORIGIN ?? "https://api.prediqsai.com").replace(/\/$/, "");

async function verifyAdmin(request: Request) {
  const token = request.headers.get("authorization");
  if (!token?.startsWith("Bearer ")) return { error: NextResponse.json({ error: "Sign in as an admin to access media." }, { status: 401 }) };
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { error: NextResponse.json({ error: "Image uploads are not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Vercel." }, { status: 503 }) };
  const userResponse = await fetch(`${apiOrigin}/api/user/me`, { headers: { Authorization: token }, cache: "no-store" });
  if (!userResponse.ok) return { error: NextResponse.json({ error: "Your session could not be verified. Please sign in again." }, { status: 401 }) };
  const user = await userResponse.json() as { id: number; isAdmin?: boolean };
  if (!user.isAdmin) return { error: NextResponse.json({ error: "Only admins can access blog media." }, { status: 403 }) };
  return { token, user, supabase: createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) };
}

export async function POST(request: Request) {
  const access = await verifyAdmin(request);
  if ("error" in access) return access.error;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  if (!validTypes.has(file.type)) return NextResponse.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 400 });
  if (file.size > maxBytes) return NextResponse.json({ error: "Images must be 3MB or smaller." }, { status: 400 });
  const path = `articles/${access.user.id}/${crypto.randomUUID()}.${extension[file.type as keyof typeof extension]}`;
  const { error } = await access.supabase.storage.from("blog_images").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: `Supabase upload failed: ${error.message}` }, { status: 502 });
  const { data } = access.supabase.storage.from("blog_images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}

export async function GET(request: Request) {
  const access = await verifyAdmin(request);
  if ("error" in access) return access.error;
  const { data, error } = await access.supabase.storage.from("blog_images").list(`articles/${access.user.id}`, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  if (error) return NextResponse.json({ error: `Supabase media listing failed: ${error.message}` }, { status: 502 });
  const files = (data ?? []).filter((file) => file.name).map((file) => ({
    name: file.name, createdAt: file.created_at,
    url: access.supabase.storage.from("blog_images").getPublicUrl(`articles/${access.user.id}/${file.name}`).data.publicUrl,
  }));
  return NextResponse.json({ files });
}