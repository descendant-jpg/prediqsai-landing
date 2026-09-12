// Central API access for the PrediQs AI Express backend.
//
// Server components fetch http://localhost:8080/api/* directly (dev) or
// API_ORIGIN (prod). Browser calls use same-origin /api/* — in dev Replit's
// path router forwards those to the api-server; on Vercel a next.config
// rewrite proxies them to API_ORIGIN.

const SERVER_API_ORIGIN =
  process.env.API_ORIGIN ??
  (process.env.VERCEL ? "https://api.prediqsai.com" : "http://localhost:8080");

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return `${SERVER_API_ORIGIN}/api${p}`;
  return `/api${p}`;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<T> {
  const { token, headers, ...rest } = init ?? {};
  const res = await fetch(apiUrl(path), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || res.statusText);
  }
  return (await res.json()) as T;
}
