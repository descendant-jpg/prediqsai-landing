"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface LatestPost {
  title: string;
  slug: string;
  publishedAt: string | null;
}

export default function Footer() {
  const [posts, setPosts] = useState<LatestPost[]>([]);

  useEffect(() => {
    apiFetch<{ posts: LatestPost[] }>("/blog/latest?limit=3")
      .then((r) => setPosts(r.posts ?? []))
      .catch(() => setPosts([]));
  }, []);

  return (
    <footer className="border-t border-edge bg-panel">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-volt text-night">
              <Zap className="h-4.5 w-4.5" strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg font-bold">
              PrediQs <span className="text-volt">AI</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            Data-backed football predictions. Every result published — wins and
            losses.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ice">
            Product
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li><Link href="/#how-it-works" className="transition hover:text-ice">How it works</Link></li>
            <li><Link href="/#picks" className="transition hover:text-ice">Today&apos;s picks</Link></li>
            <li><Link href="/results" className="transition hover:text-ice">Results record</Link></li>
            <li><Link href="/#pricing" className="transition hover:text-ice">Pricing</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ice">
            Free Betting Guides
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            {posts.length > 0 ? (
              posts.map((p) => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.slug}`} className="transition hover:text-ice">
                    {p.title}
                  </Link>
                </li>
              ))
            ) : (
              <li>
                <Link href="/blog" className="transition hover:text-ice">
                  Visit the blog
                </Link>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ice">
            Legal
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li><Link href="/terms" className="transition hover:text-ice">Terms of Service</Link></li>
            <li><Link href="/privacy" className="transition hover:text-ice">Privacy Policy</Link></li>
            <li><Link href="/support" className="transition hover:text-ice">Support</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-edge">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} PrediQs AI. All rights reserved.</p>
          <p className="text-center sm:text-right">
            18+ only. Bet responsibly — predictions are informational, not
            financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
