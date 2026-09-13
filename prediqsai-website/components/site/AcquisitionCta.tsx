"use client";

import Link from "next/link";
import { useState } from "react";
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

function UpgradeInAppModal({ onClose }: { onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="upgrade-in-app-title" className="fixed inset-0 z-[80] flex items-center justify-center bg-night/75 p-5 backdrop-blur-sm" onMouseDown={onClose}>
      <section className="relative w-full max-w-md overflow-hidden rounded-2xl border border-volt/35 bg-panel/90 p-7 shadow-[0_0_0_1px_rgba(0,230,122,0.08),0_24px_80px_-28px_rgba(0,230,122,0.7)] backdrop-blur-xl sm:p-9" onMouseDown={(event) => event.stopPropagation()}>
        <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-volt/15 blur-3xl" />
        <div className="relative">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-volt">Premium membership</p>
          <h2 id="upgrade-in-app-title" className="mt-3 font-display text-3xl font-bold tracking-tight text-ice">Upgrade in the App</h2>
          <p className="mt-4 leading-7 text-muted">To securely process your subscription using Apple Pay or Google Play Billing, please open the PrediQs AI mobile app and tap &apos;Go Pro&apos;.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <span aria-label="Download on the App Store coming soon" className="rounded-lg border border-edge bg-night/60 px-4 py-3 text-center text-xs font-semibold text-muted">Download on the App Store</span>
            <span aria-label="Get it on Google Play coming soon" className="rounded-lg border border-edge bg-night/60 px-4 py-3 text-center text-xs font-semibold text-muted">Get it on Google Play</span>
          </div>
          <button type="button" onClick={onClose} className="mt-6 w-full rounded-lg bg-volt px-5 py-3 text-sm font-semibold text-night transition hover:bg-volt/90">Got it</button>
        </div>
      </section>
    </div>
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