import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { apiFetch } from "@/lib/api";

export const metadata: Metadata = {
  title: "Blog",
  description: "Sports analytics guides, model insights, and responsible betting strategy from PrediQs AI.",
};

type Post = { title: string; slug: string; excerpt: string | null; author: string; publishedAt: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default async function BlogPage() {
  let posts: Post[] = [];
  let failed = false;
  try {
    ({ posts } = await apiFetch<{ posts: Post[] }>("/blog?limit=24"));
  } catch {
    failed = true;
  }

  return (
    <main className="min-h-screen bg-night">
      <section className="bg-grid border-b border-edge">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
          <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-volt">Research desk</p>
          <h1 className="max-w-3xl font-display text-4xl font-bold tracking-tight text-ice sm:text-6xl">Sharper thinking starts here.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">Practical guides on data-driven picks, model confidence, bankroll discipline, and the numbers behind the game.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        {failed ? (
          <div className="rounded-2xl border border-edge bg-panel p-10 text-center">
            <p className="font-display text-xl font-semibold text-ice">The research desk is temporarily unavailable.</p>
            <p className="mt-2 text-sm text-muted">Please check back shortly.</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-edge bg-panel/60 p-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-volt" aria-hidden="true" />
            <h2 className="mt-4 font-display text-2xl font-semibold text-ice">Guides are on the way</h2>
            <p className="mt-2 text-muted">Our analysts are preparing the first dispatch.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className={`group flex min-h-72 flex-col rounded-2xl border border-edge bg-panel p-6 transition hover:-translate-y-1 hover:border-volt/40 hover:bg-panel-2 ${index === 0 ? "card-glow md:col-span-2 md:min-h-96 md:p-10" : ""}`}>
                <div className="flex items-center justify-between gap-4 font-mono text-xs uppercase tracking-wider text-muted">
                  <span>{formatDate(post.publishedAt)}</span>
                  <ArrowUpRight className="h-4 w-4 transition group-hover:text-volt" aria-hidden="true" />
                </div>
                <div className="mt-auto pt-12">
                  {index === 0 && <span className="mb-4 inline-flex rounded-full border border-volt/30 bg-volt/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-volt">Featured</span>}
                  <h2 className={`font-display font-semibold leading-tight text-ice ${index === 0 ? "text-3xl sm:text-4xl" : "text-2xl"}`}>{post.title}</h2>
                  {post.excerpt && <p className="mt-4 line-clamp-3 leading-7 text-muted">{post.excerpt}</p>}
                  <p className="mt-6 text-sm font-medium text-ice">By {post.author}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
