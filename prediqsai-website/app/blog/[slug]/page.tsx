import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { extractBlogMeta } from "@/lib/blogMeta";
import { ArticleShareRow, PremiumArticleCta, ReadingProgress } from "@/components/blog/BlogArticleEnhancements";

export const revalidate = 300;

type Post = { title: string; slug: string; excerpt: string | null; content: string; author: string; publishedAt: string; updatedAt?: string | null };
type PostSummary = Pick<Post, "title" | "slug" | "excerpt" | "author" | "publishedAt">;
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://prediqsai.com").replace(/\/$/, "");
const getPost = cache((slug: string) => apiFetch<Post>(`/blog/${encodeURIComponent(slug)}`));
const getRelatedPosts = cache(() => apiFetch<{ posts: PostSummary[] }>("/blog?limit=4"));

function inlineBold(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={index} className="font-semibold text-ice">{part.slice(2, -2)}</strong> : part);
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await getPost(slug);
    const { meta, content } = extractBlogMeta(post.content);
    const description = meta.metaDescription || post.excerpt || content.slice(0, 155);
    return {
       title: meta.metaTitle || post.title,
      description,
      alternates: { canonical: `/blog/${encodeURIComponent(post.slug)}` },
      openGraph: {
         type: "article", title: meta.metaTitle || post.title, description,
        url: `/blog/${encodeURIComponent(post.slug)}`,
        publishedTime: post.publishedAt, modifiedTime: post.updatedAt || post.publishedAt,
         authors: [post.author], images: [meta.ogImage || meta.featuredImage || "/opengraph.jpg"],
      },
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return { title: "Blog", description: "PrediQs AI research and analysis." };
  }
}

export default async function BlogArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let post: Post;
  try {
    post = await getPost(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return <main className="mx-auto min-h-[65vh] max-w-3xl px-5 py-20 sm:px-8"><div className="rounded-2xl border border-edge bg-panel p-10 text-center"><h1 className="font-display text-2xl font-semibold">This article could not be loaded.</h1><p className="mt-2 text-muted">Please try again in a few moments.</p><Link href="/blog" className="mt-6 inline-flex text-sm font-semibold text-volt">Back to blog</Link></div></main>;
  }
  const { meta, content } = extractBlogMeta(post.content);
  let relatedPosts: PostSummary[] = [];
  try {
    const related = await getRelatedPosts();
    relatedPosts = related.posts.filter((item) => item.slug !== post.slug).slice(0, 3);
  } catch {
    relatedPosts = [];
  }
  const paragraphs = content.trim().split(/\n\s*\n/).filter(Boolean);
  const authorType = post.author.toLowerCase().includes("prediqs") ? "Organization" : "Person";
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
     description: meta.metaDescription || post.excerpt || content.slice(0, 155),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { "@type": authorType, name: post.author },
    publisher: { "@type": "Organization", name: "PrediQs AI", url: siteUrl },
     image: meta.ogImage || meta.featuredImage || `${siteUrl}/opengraph.jpg`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}/blog/${encodeURIComponent(post.slug)}` },
  };
  // Escaping '<' prevents admin-authored content from ending this JSON-LD script.
  const jsonLd = JSON.stringify(articleSchema).replace(/</g, "\\u003c");
  return <main className="min-h-screen bg-night"><ReadingProgress /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} /><article className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
    <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-volt"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to blog</Link>
    <header className="border-b border-edge pb-10 pt-12">{meta.featuredImage && <img src={meta.featuredImage} alt="" className="mb-10 aspect-[2/1] w-full rounded-2xl border border-edge object-cover" />}<p className="font-mono text-xs uppercase tracking-[0.2em] text-volt">{meta.category || "PrediQs research"}</p><h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight text-ice sm:text-6xl">{post.title}</h1>{post.excerpt && <p className="mt-6 text-lg leading-8 text-muted sm:text-xl">{post.excerpt}</p>}<div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted"><span className="font-semibold text-ice">{post.author}</span><span aria-hidden="true">/</span><time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time></div></header>
    <div className="space-y-6 py-10 text-[17px] leading-8 text-muted">{paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-line">{inlineBold(paragraph)}</p>)}</div>
    <ArticleShareRow title={post.title} url={`${siteUrl}/blog/${encodeURIComponent(post.slug)}`} />
    <div className="mt-10"><PremiumArticleCta articleSlug={post.slug} articleTitle={post.title} /></div>
    {relatedPosts.length > 0 && <section className="mt-16 border-t border-edge pt-10"><div className="flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-volt">Keep learning</p><h2 className="mt-2 font-display text-2xl font-bold text-ice">Related analysis</h2></div><Link href="/blog" className="text-sm font-semibold text-volt transition hover:text-ice">View all</Link></div><div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{relatedPosts.map((item) => <Link key={item.slug} href={`/blog/${item.slug}`} className="group rounded-xl border border-edge bg-panel/60 p-5 transition hover:-translate-y-0.5 hover:border-volt/40 hover:bg-panel"><p className="font-mono text-[10px] uppercase tracking-wider text-muted">{formatDate(item.publishedAt)}</p><h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ice transition group-hover:text-volt">{item.title}</h3>{item.excerpt && <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{item.excerpt}</p>}<p className="mt-4 text-xs font-semibold text-volt">Read analysis →</p></Link>)}</div></section>}
  </article></main>;
}
