export type BlogMeta = {
  category: string;
  featuredImage: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
};

export const EMPTY_BLOG_META: BlogMeta = {
  category: "",
  featuredImage: "",
  metaTitle: "",
  metaDescription: "",
  ogImage: "",
};

const fields = ["category", "featuredImage", "metaTitle", "metaDescription", "ogImage"] as const;

export function extractBlogMeta(raw: string): { meta: BlogMeta; content: string } {
  if (!raw.startsWith("---\n")) return { meta: EMPTY_BLOG_META, content: raw };
  const end = raw.indexOf("\n---\n", 4);
  if (end < 0) return { meta: EMPTY_BLOG_META, content: raw };
  const values = raw.slice(4, end).split("\n");
  const meta = { ...EMPTY_BLOG_META };
  for (const value of values) {
    const divider = value.indexOf(":");
    if (divider < 0) continue;
    const key = value.slice(0, divider).trim() as keyof BlogMeta;
    if (fields.includes(key)) meta[key] = value.slice(divider + 1).trim();
  }
  return { meta, content: raw.slice(end + 5).trimStart() };
}

export function withBlogMeta(content: string, meta: BlogMeta): string {
  const body = extractBlogMeta(content).content.trim();
  const lines = fields
    .filter((field) => meta[field].trim())
    .map((field) => `${field}: ${meta[field].trim().replace(/\n/g, " ")}`);
  return lines.length ? `---\n${lines.join("\n")}\n---\n\n${body}` : body;
}