import type { MetadataRoute } from "next";
import { apiFetch } from "@/lib/api";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://prediqsai.com").replace(/\/$/, "");
type PublishedPost = { slug: string; publishedAt: string | null; updatedAt?: string | null };
type BlogPage = { posts: PublishedPost[]; total: number };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages omit lastModified: they are not falsely marked as changed on
  // every sitemap request. Article dates come from their database records.
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/how-it-works`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/results`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/blog`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/support`, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    // Public blog API filters unpublished/future posts and reads only Postgres.
    const firstPage = await apiFetch<BlogPage>("/blog?limit=100&page=1");
    const pages = Math.ceil((firstPage.total ?? 0) / 100);
    const remaining = await Promise.all(
      Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
        apiFetch<BlogPage>(`/blog?limit=100&page=${index + 2}`),
      ),
    );
    const posts = [firstPage, ...remaining].flatMap((page) => page.posts ?? []);
    return [
      ...staticPages,
      ...posts.map((post) => ({
        url: `${siteUrl}/blog/${encodeURIComponent(post.slug)}`,
        lastModified: post.updatedAt ?? post.publishedAt ?? undefined,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    // A temporarily unavailable API should never make /sitemap.xml fail.
    return staticPages;
  }
}
