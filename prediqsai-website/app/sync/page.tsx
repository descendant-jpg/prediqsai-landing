"use client";

import Link from "next/link";
import { ArrowUpRight, FileText, Globe2, PenLine, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Post = { id: number; title: string; slug: string; publishedAt: string | null; updatedAt: string };

export default function SyncOverview() {
  const { token } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const load = useCallback(async () => { if (token) setPosts((await apiFetch<{ posts: Post[] }>("/admin/blog", { token })).posts); }, [token]);
  useEffect(() => { void load(); }, [load]);
  const published = posts.filter((post) => post.publishedAt).length;
  const stats = [{ label: "Total articles", value: posts.length, icon: FileText }, { label: "Published", value: published, icon: Globe2 }, { label: "Drafts", value: posts.length - published, icon: PenLine }];
  return <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-volt">Overview</p><h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Publishing command center</h1><p className="mt-2 max-w-xl text-muted">Manage the research and editorial work behind PrediQs AI.</p></div><Link href="/sync/articles/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-volt px-4 py-3 text-sm font-bold text-night transition hover:bg-volt-deep"><Plus className="h-4 w-4" /> Create article</Link></div>
    <div className="mt-9 grid gap-4 sm:grid-cols-3">{stats.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-white/8 bg-panel p-5"><Icon className="h-4 w-4 text-volt" /><p className="mt-6 font-mono text-3xl font-semibold text-ice">{value}</p><p className="mt-1 text-sm text-muted">{label}</p></div>)}</div>
    <section className="mt-8 rounded-xl border border-white/8 bg-panel"><div className="flex items-center justify-between border-b border-white/8 px-5 py-4"><div><h2 className="font-display font-semibold">Recent articles</h2><p className="mt-1 text-xs text-muted">Your latest newsroom activity</p></div><Link href="/sync/articles" className="inline-flex items-center gap-1 text-sm font-semibold text-volt hover:text-ice">All articles <ArrowUpRight className="h-4 w-4" /></Link></div><div className="divide-y divide-white/8">{posts.slice(0, 5).map((post) => <Link key={post.id} href={`/sync/articles/${post.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-white/[.025]"><div className="min-w-0"><p className="truncate font-medium">{post.title}</p><p className="mt-1 font-mono text-xs text-muted">/{post.slug}</p></div><span className={post.publishedAt ? "rounded-full bg-volt/10 px-2 py-1 font-mono text-[10px] uppercase text-volt" : "rounded-full bg-gold/10 px-2 py-1 font-mono text-[10px] uppercase text-gold"}>{post.publishedAt ? "Published" : "Draft"}</span></Link>)}{!posts.length && <p className="px-5 py-10 text-center text-sm text-muted">No articles yet. Start a new draft to populate the newsroom.</p>}</div></section>
  </main>;
}