"use client";

import Link from "next/link";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { BlogPost, apiErrorMessage } from "./types";

export default function ArticlesPage() {
  const { token } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const load = useCallback(async () => { if (!token) return; try { setPosts((await apiFetch<{ posts: BlogPost[] }>("/admin/blog", { token })).posts); } catch (e) { setError(apiErrorMessage(e, "Unable to load articles.")); } }, [token]);
  useEffect(() => { void load(); }, [load]);
  const matches = posts.filter((post) => `${post.title} ${post.slug}`.toLowerCase().includes(query.toLowerCase()));
  async function remove(post: BlogPost) {
    if (!token || !window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setDeleting(post.id); setError("");
    try { await apiFetch(`/admin/blog/${post.id}`, { method: "DELETE", token }); setPosts((all) => all.filter((item) => item.id !== post.id)); }
    catch (e) { setError(apiErrorMessage(e, "Unable to delete article.")); }
    finally { setDeleting(null); }
  }
  return <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-volt">Articles</p><h1 className="mt-2 font-display text-3xl font-bold">Editorial library</h1><p className="mt-2 text-muted">Create, revise, and publish your research.</p></div><Link href="/sync/articles/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-volt px-4 py-3 text-sm font-bold text-night"><Plus className="h-4 w-4" /> Add new post</Link></div>
    <div className="mt-8 flex items-center gap-3 rounded-xl border border-white/8 bg-panel px-4 py-3"><Search className="h-4 w-4 text-muted" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title or slug" className="w-full bg-transparent text-sm outline-none placeholder:text-muted" /></div>
    {error && <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
    <div className="mt-5 overflow-hidden rounded-xl border border-white/8 bg-panel"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-white/8 bg-white/[.025] font-mono text-[10px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-4">Article</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Last updated</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-white/8">{matches.map((post) => <tr key={post.id} className="hover:bg-white/[.025]"><td className="px-5 py-4"><p className="font-medium text-ice">{post.title}</p><p className="mt-1 font-mono text-xs text-muted">/{post.slug}</p></td><td className="px-5 py-4"><span className={post.publishedAt ? "rounded-full bg-volt/10 px-2 py-1 font-mono text-[10px] uppercase text-volt" : "rounded-full bg-gold/10 px-2 py-1 font-mono text-[10px] uppercase text-gold"}>{post.publishedAt ? "Published" : "Draft"}</span></td><td className="px-5 py-4 text-muted">{new Date(post.updatedAt).toLocaleDateString()}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Link aria-label={`Edit ${post.title}`} href={`/sync/articles/${post.id}`} className="rounded-lg border border-edge p-2 text-muted hover:border-volt/50 hover:text-volt"><Pencil className="h-4 w-4" /></Link><button aria-label={`Delete ${post.title}`} onClick={() => void remove(post)} disabled={deleting === post.id} className="rounded-lg border border-edge p-2 text-muted hover:border-danger/50 hover:text-danger disabled:opacity-40"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>{!matches.length && <p className="px-5 py-12 text-center text-sm text-muted">No matching articles.</p>}</div>
  </main>;
}