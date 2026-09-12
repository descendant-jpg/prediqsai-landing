"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Save, ShieldX } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { apiErrorMessage, BlogPost } from "./types";

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function EditorSkeleton() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse px-4 py-14">
      <div className="h-8 w-60 rounded bg-panel-2" />
      <div className="mt-8 space-y-5 rounded-xl border border-edge bg-panel p-6">
        <div className="h-12 rounded bg-panel-2" /><div className="h-12 rounded bg-panel-2" />
        <div className="h-28 rounded bg-panel-2" /><div className="h-64 rounded bg-panel-2" />
      </div>
    </div>
  );
}

export default function PostEditor({ postId }: { postId?: number }) {
  const router = useRouter();
  const { user, token, loading } = useAuth();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [publish, setPublish] = useState(false);
  const [fetching, setFetching] = useState(Boolean(postId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!postId && user && !author) setAuthor(user.displayName || user.username || "PrediQs AI");
  }, [postId, user, author]);

  useEffect(() => {
    if (!postId || !token || !user?.isAdmin) return;
    let active = true;
    setFetching(true);
    setError("");
    apiFetch<{ posts: BlogPost[] }>("/admin/blog", { token })
      .then(({ posts }) => {
        if (!active) return;
        const post = posts.find((item) => item.id === postId);
        if (!post) throw new Error("Blog post not found.");
        setTitle(post.title);
        setSlug(post.slug);
        setSlugTouched(true);
        setExcerpt(post.excerpt || "");
        setContent(post.content);
        setAuthor(post.author || user.displayName || user.username || "PrediQs AI");
        setPublish(Boolean(post.publishedAt));
      })
      .catch((err) => active && setError(apiErrorMessage(err, "Unable to load this post.")))
      .finally(() => active && setFetching(false));
    return () => { active = false; };
  }, [postId, token, user]);

  function updateTitle(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!title.trim() || !slug.trim() || !content.trim() || !author.trim()) {
      setError("Title, slug, content, and author are required.");
      return;
    }
    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(postId ? `/admin/blog/${postId}` : "/admin/blog", {
        method: postId ? "PUT" : "POST",
        token,
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim() || (postId ? null : undefined),
          content,
          author: author.trim(),
          publish,
        }),
      });
      router.push("/admin/blog");
    } catch (err) {
      setError(apiErrorMessage(err, "Unable to save this post."));
      setSaving(false);
    }
  }

  if (loading || (!user && !loading) || fetching) return <EditorSkeleton />;

  if (user && !user.isAdmin) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-edge bg-panel p-8 text-center">
          <ShieldX className="mx-auto text-danger" size={40} />
          <h1 className="mt-4 font-display text-2xl font-bold">Admins only</h1>
          <p className="mt-2 text-muted">You do not have access to the content editor.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ice"><ArrowLeft size={17} /> Back to dashboard</Link>
        <div className="mt-6">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-volt">{postId ? "Edit entry" : "New entry"}</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ice sm:text-4xl">{postId ? "Edit blog post" : "Create blog post"}</h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 rounded-xl border border-edge bg-panel p-5 sm:p-7">
          {error && <div role="alert" className="mb-6 rounded-lg border border-danger/35 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-ice sm:col-span-2">Title
              <input required value={title} onChange={(e) => updateTitle(e.target.value)} className="mt-2 w-full rounded-lg border border-edge bg-panel-2 px-4 py-3 outline-none focus:border-volt/70 focus:ring-2 focus:ring-volt/10" placeholder="Post title" />
            </label>
            <label className="block text-sm font-medium text-ice">Slug
              <input required value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} className="mt-2 w-full rounded-lg border border-edge bg-panel-2 px-4 py-3 font-mono text-sm outline-none focus:border-volt/70 focus:ring-2 focus:ring-volt/10" placeholder="post-title" />
            </label>
            <label className="block text-sm font-medium text-ice">Author
              <input required value={author} onChange={(e) => setAuthor(e.target.value)} className="mt-2 w-full rounded-lg border border-edge bg-panel-2 px-4 py-3 outline-none focus:border-volt/70 focus:ring-2 focus:ring-volt/10" />
            </label>
            <label className="block text-sm font-medium text-ice sm:col-span-2">Excerpt
              <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} className="mt-2 w-full resize-y rounded-lg border border-edge bg-panel-2 px-4 py-3 leading-6 outline-none focus:border-volt/70 focus:ring-2 focus:ring-volt/10" placeholder="A concise summary for previews." />
            </label>
            <label className="block text-sm font-medium text-ice sm:col-span-2">Content
              <textarea required value={content} onChange={(e) => setContent(e.target.value)} rows={18} className="mt-2 w-full resize-y rounded-lg border border-edge bg-panel-2 px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-volt/70 focus:ring-2 focus:ring-volt/10" placeholder="Write your post in Markdown..." />
            </label>
          </div>
          <div className="mt-6 flex flex-col gap-5 border-t border-edge pt-6 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-ice">
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="h-4 w-4 accent-volt" />
              Publish now
            </label>
            <div className="flex gap-3">
              <Link href="/admin/blog" className="rounded-lg border border-edge px-5 py-3 text-sm font-semibold text-muted hover:bg-panel-2 hover:text-ice">Cancel</Link>
              <button type="submit" disabled={saving} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-volt px-5 py-3 font-display text-sm font-bold text-night hover:bg-volt/90 disabled:opacity-60">
                <Save size={17} /> {saving ? "Saving..." : "Save post"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}