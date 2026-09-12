"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FileText, Pencil, Plus, ShieldX, Trash2 } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { apiErrorMessage, BlogPost } from "./types";

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-16 sm:px-6">
      <div className="h-9 w-64 rounded bg-panel-2" />
      <div className="mt-8 overflow-hidden rounded-xl border border-edge bg-panel">
        {[1, 2, 3, 4].map((row) => <div key={row} className="h-16 border-b border-edge p-5 last:border-0"><div className="h-4 w-2/3 rounded bg-panel-2" /></div>)}
      </div>
    </div>
  );
}

export default function AdminBlogPage() {
  const router = useRouter();
  const { user, token, loading } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadPosts = useCallback(async () => {
    if (!token) return;
    setFetching(true);
    setError("");
    try {
      const data = await apiFetch<{ posts: BlogPost[] }>("/admin/blog", { token });
      setPosts(data.posts);
    } catch (err) {
      setError(apiErrorMessage(err, "Unable to load blog posts."));
    } finally {
      setFetching(false);
    }
  }, [token]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.isAdmin && token) void loadPosts();
    else if (!loading) setFetching(false);
  }, [user, token, loading, loadPosts]);

  async function deletePost(post: BlogPost) {
    if (!token || !window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setDeleting(post.id);
    setError("");
    try {
      await apiFetch<{ success: boolean }>(`/admin/blog/${post.id}`, { method: "DELETE", token });
      setPosts((current) => current.filter((item) => item.id !== post.id));
    } catch (err) {
      setError(apiErrorMessage(err, "Unable to delete this post."));
    } finally {
      setDeleting(null);
    }
  }

  if (loading || (!user && !loading) || (user?.isAdmin && fetching)) return <LoadingSkeleton />;

  if (user && !user.isAdmin) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center px-4 py-16">
        <div className="max-w-md rounded-2xl border border-edge bg-panel p-8 text-center">
          <ShieldX className="mx-auto text-danger" size={40} />
          <h1 className="mt-5 font-display text-2xl font-bold text-ice">Admins only</h1>
          <p className="mt-3 text-muted">Your account does not have permission to manage blog content.</p>
          <Link href="/" className="mt-7 inline-block rounded-lg border border-edge px-5 py-3 text-sm font-semibold text-ice hover:bg-panel-2">Return home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-volt">Content desk</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-ice sm:text-4xl">Blog dashboard</h1>
            <p className="mt-2 text-muted">Create, publish, and maintain editorial content.</p>
          </div>
          <Link href="/admin/blog/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-volt px-5 py-3 font-display text-sm font-bold text-night hover:bg-volt/90">
            <Plus size={18} /> New Post
          </Link>
        </div>

        {error && <div role="alert" className="mt-7 flex items-center justify-between gap-4 rounded-lg border border-danger/35 bg-danger/10 px-4 py-3 text-sm text-danger"><span>{error}</span><button onClick={() => void loadPosts()} className="font-semibold underline">Retry</button></div>}

        <div className="mt-8 overflow-hidden rounded-xl border border-edge bg-panel">
          {posts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FileText className="mx-auto text-muted" size={36} />
              <h2 className="mt-4 font-display text-lg font-semibold text-ice">No posts yet</h2>
              <p className="mt-2 text-sm text-muted">Create your first post to begin building the newsroom.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead className="border-b border-edge bg-panel-2 font-mono text-[11px] uppercase tracking-wider text-muted">
                  <tr><th className="px-5 py-4">Title</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Published</th><th className="px-5 py-4 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {posts.map((post) => (
                    <tr key={post.id} className="transition hover:bg-panel-2/50">
                      <td className="px-5 py-4"><p className="font-medium text-ice">{post.title}</p><p className="mt-1 font-mono text-xs text-muted">/{post.slug}</p></td>
                      <td className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 font-mono text-xs ${post.publishedAt ? "border-volt/30 bg-volt/10 text-volt" : "border-gold/30 bg-gold/10 text-gold"}`}>{post.publishedAt ? "Published" : "Draft"}</span></td>
                      <td className="px-5 py-4 font-mono text-xs text-muted">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"}</td>
                      <td className="px-5 py-4"><div className="flex justify-end gap-2">
                        <Link href={`/admin/blog/${post.id}`} aria-label={`Edit ${post.title}`} className="rounded-lg border border-edge p-2 text-muted hover:border-volt/40 hover:text-volt"><Pencil size={16} /></Link>
                        <button onClick={() => void deletePost(post)} disabled={deleting === post.id} aria-label={`Delete ${post.title}`} className="rounded-lg border border-edge p-2 text-muted hover:border-danger/40 hover:text-danger disabled:opacity-40"><Trash2 size={16} /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}