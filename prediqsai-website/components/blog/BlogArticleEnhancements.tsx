"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

type ShareIcon = "x" | "whatsapp" | "telegram" | "copy";

function ShareSvg({ icon }: { icon: ShareIcon }) {
  if (icon === "x") {
    return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current"><path d="M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-6.42L6.43 22H3.3l7.25-8.29L.9 2h6.4l4.43 5.85L18.9 2Zm-1.1 18h1.72L6.37 3.9H4.52L17.8 20Z" /></svg>;
  }
  if (icon === "whatsapp") {
    return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current"><path d="M20.52 3.48A11.94 11.94 0 0 0 12.04 0C5.46 0 .1 5.35.1 11.95c0 2.1.55 4.15 1.6 5.95L0 24l6.27-1.64a12 12 0 0 0 5.76 1.47h.01c6.59 0 11.95-5.36 11.95-11.95 0-3.19-1.24-6.19-3.47-8.4Zm-8.48 18.3a9.92 9.92 0 0 1-5.06-1.39l-.36-.21-3.72.98 1-3.62-.24-.38a9.89 9.89 0 0 1-1.52-5.27c0-5.47 4.44-9.92 9.9-9.92 2.65 0 5.13 1.03 7 2.9a9.83 9.83 0 0 1 2.9 7.01c0 5.47-4.44 9.91-9.9 9.91Zm5.43-7.43c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.76.97-.93 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.47-2.4-1.5a9.02 9.02 0 0 1-1.66-2.07c-.17-.3-.02-.45.13-.6.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.08-.8.37s-1.04 1.02-1.04 2.48 1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.5.71.3 1.27.49 1.7.63.72.23 1.37.2 1.89.12.58-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.18-1.42-.07-.12-.27-.2-.57-.35Z" /></svg>;
  }
  if (icon === "telegram") {
    return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current"><path d="M21.4 3.3 18.1 20c-.25 1.18-.9 1.47-1.83.92l-5.05-3.72-2.44 2.35c-.27.27-.5.5-1.02.5l.36-5.14 9.35-8.45c.4-.36-.09-.56-.63-.2L5.3 13.53.33 11.97c-1.08-.34-1.1-1.08.23-1.6L20 2.87c.9-.33 1.68.2 1.4.43Z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 9V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" /></svg>;
}

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height > 0 ? Math.min(100, (window.scrollY / height) * 100) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);

  return <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-night/30"><div className="h-full bg-volt shadow-[0_0_10px_rgba(0,230,122,0.9)] transition-[width] duration-100" style={{ width: `${progress}%` }} /></div>;
}

export function ArticleShareRow({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const actions: Array<{ icon: ShareIcon; label: string; href?: string }> = [
    { icon: "x", label: "Share on X", href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { icon: "whatsapp", label: "Share on WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
    { icon: "telegram", label: "Share on Telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
  ];
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return <section aria-label="Share this article" className="flex flex-wrap items-center gap-2 border-y border-edge py-5">
    <span className="mr-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Share analysis</span>
    {actions.map((action) => <a key={action.icon} href={action.href} target="_blank" rel="noreferrer" aria-label={action.label} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-edge bg-panel/70 text-muted transition hover:border-volt/50 hover:bg-volt/10 hover:text-volt"><ShareSvg icon={action.icon} /></a>)}
    <button type="button" onClick={() => void copy()} aria-label="Copy article link" className="inline-flex h-9 items-center gap-2 rounded-full border border-edge bg-panel/70 px-3 text-xs font-medium text-muted transition hover:border-volt/50 hover:bg-volt/10 hover:text-volt"><ShareSvg icon="copy" />{copied ? "Copied" : "Copy link"}</button>
  </section>;
}

export function PremiumArticleCta() {
  const { user, loading } = useAuth();
  const destination = !loading && !user ? "/login?next=%2Fpricing" : "/pricing";
  return <section className="relative overflow-hidden rounded-2xl border border-volt/35 bg-panel/70 p-7 shadow-[0_0_0_1px_rgba(0,230,122,0.06),0_18px_55px_-22px_rgba(0,230,122,0.5)] backdrop-blur-xl sm:p-9">
    <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-volt/15 blur-3xl" />
    <div className="relative">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-volt">Premium intelligence</p>
      <h2 className="mt-3 max-w-xl font-display text-2xl font-bold tracking-tight text-ice sm:text-3xl">Ready to stop watching and start winning?</h2>
      <p className="mt-3 max-w-2xl leading-7 text-muted">Unlock today&apos;s AI-verified slips, exact risk probabilities, and premium bet codes.</p>
      <Link href={destination} className="mt-6 inline-flex rounded-lg bg-volt px-5 py-3 text-sm font-semibold text-night transition hover:bg-volt/90">Upgrade to Pro</Link>
    </div>
  </section>;
}