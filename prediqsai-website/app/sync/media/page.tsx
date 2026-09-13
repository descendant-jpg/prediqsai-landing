"use client";

import { Image as ImageIcon, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type File = { name: string; url: string; createdAt?: string };
export default function MediaLibraryPage() {
  const { token } = useAuth(); const [files, setFiles] = useState<File[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { if (!token) return; try { const result = await apiFetch<{ files: File[] }>("/blog-images", { token }); setFiles(result.files); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load media."); } finally { setLoading(false); } }, [token]);
  useEffect(() => { void load(); }, [load]);
  return <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8"><p className="font-mono text-xs uppercase tracking-[.2em] text-volt">Media library</p><h1 className="mt-2 font-display text-3xl font-bold">Uploaded article images</h1><p className="mt-2 text-muted">Images uploaded from the article editor are available here.</p>{loading && <div className="mt-10 flex items-center gap-2 text-sm text-muted"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading media...</div>}{error && <p role="alert" className="mt-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}{!loading && !error && <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{files.map((file) => <a key={file.name} href={file.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-white/10 bg-panel hover:border-volt/50"><img src={file.url} alt="" className="aspect-video w-full object-cover" /><p className="truncate p-3 text-xs text-muted">{file.name}</p></a>)}{!files.length && <div className="col-span-full rounded-xl border border-dashed border-edge p-12 text-center text-muted"><ImageIcon className="mx-auto h-7 w-7" /><p className="mt-3 text-sm">No uploaded images yet.</p></div>}</div>}</main>;
}