"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth";

type PremiumAnalytics = {
  articleSlug: string;
  articleTitle: string;
};

declare global {
  interface Window {
    gtag?: (event: "event", action: string, params?: Record<string, string>) => void;
  }
}

function GooglePlayIcon() {
  return <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8 shrink-0">
    <path fill="#00d7fe" d="M5.1 3.4C4.4 4.2 4 5.4 4 7v34c0 1.6.4 2.8 1.1 3.6L26.3 24 5.1 3.4Z" />
    <path fill="#00e676" d="m29 26.7-7.7-7.7L5.1 44.6c.8.9 2 1.3 3.5.5L29 33.3V26.7Z" />
    <path fill="#ffca28" d="m8.6 2.9c-1.5-.8-2.7-.4-3.5.5L21.3 19 29 11.3 8.6 2.9Z" />
    <path fill="#ff3d71" d="M42.4 21.1 29 15.6 21.3 24 29 32.4l13.4-5.5c2.1-.9 2.1-4.9 0-5.8Z" />
  </svg>;
}

function AppleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 shrink-0 fill-current">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.08-.48-3.23 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.52 7.59 9.09 7.31c1.36.07 2.31.75 3.11.8 1.19-.24 2.34-.93 3.61-.84 1.52.12 2.66.72 3.42 1.8-3.14 1.88-2.39 6.01.49 7.17-.58 1.53-1.33 3.05-2.67 4.05ZM12.1 7.25C11.95 4.98 13.79 3.11 15.85 3c.29 2.62-2.38 4.5-3.75 4.25Z" />
  </svg>;
}

function StoreBadge({ store }: { store: "apple" | "google" }) {
  const isApple = store === "apple";
  const href = isApple
    ? process.env.NEXT_PUBLIC_APP_STORE_URL || "https://apps.apple.com"
    : "https://play.google.com/store/apps/details?id=com.tradiqsai.app";
  return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={isApple ? "Download PrediQs AI on the App Store" : "Get PrediQs AI on Google Play"} className="flex min-h-16 flex-1 items-center justify-center gap-3 rounded-xl border border-white/20 bg-black px-4 py-2.5 text-left text-white transition hover:border-volt/70 hover:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-volt focus:ring-offset-2 focus:ring-offset-neutral-900">
    {isApple ? <AppleIcon /> : <GooglePlayIcon />}
    <span className="leading-none">
      <span className="block text-[9px] font-medium uppercase tracking-wide text-white/80">{isApple ? "Download on the" : "Get it on"}</span>
      <span className="mt-1 block text-lg font-semibold tracking-tight">{isApple ? "App Store" : "Google Play"}</span>
    </span>
  </a>;
}

function UpgradeInAppModal({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="upgrade-in-app-title" className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/95 p-6 shadow-2xl backdrop-blur-xl" onMouseDown={(event) => event.stopPropagation()}>
        <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close upgrade dialog" className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-volt">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="pr-10 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-volt">Premium membership</p>
        <h2 id="upgrade-in-app-title" className="mt-3 font-display text-3xl font-bold tracking-tight text-white">Upgrade in the App</h2>
        <p className="mt-4 leading-7 text-neutral-300">To securely process your subscription using Apple Pay or Google Play Billing, please open the PrediQs AI mobile app and tap &apos;Go Pro&apos;.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <StoreBadge store="apple" />
          <StoreBadge store="google" />
        </div>
        <button type="button" onClick={onClose} className="mt-6 w-full rounded-lg bg-volt px-5 py-3 text-sm font-semibold text-night transition hover:bg-volt/90 focus:outline-none focus:ring-2 focus:ring-volt focus:ring-offset-2 focus:ring-offset-neutral-900">Continue Browsing</button>
      </section>
    </div>,
    document.body,
  );
}

export default function AcquisitionCta({
  kind,
  children,
  className,
  analytics,
}: {
  kind: "free" | "premium";
  children: React.ReactNode;
  className: string;
  analytics?: PremiumAnalytics;
}) {
  const { user, loading } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const trackPremiumClick = () => {
    if (analytics) {
      window.gtag?.("event", "premium_click", {
        article_slug: analytics.articleSlug,
        article_title: analytics.articleTitle,
      });
    }
  };

  if (kind === "free" && !loading && user) {
    return <Link href="/results" className={className}>View Picks</Link>;
  }

  if (kind === "premium" && !loading && user) {
    return <>
      <button type="button" onClick={() => { trackPremiumClick(); setShowUpgradeModal(true); }} className={className}>{children}</button>
      {showUpgradeModal && <UpgradeInAppModal onClose={() => setShowUpgradeModal(false)} />}
    </>;
  }

  return <Link href="/register" onClick={kind === "premium" ? trackPremiumClick : undefined} className={className}>{children}</Link>;
}