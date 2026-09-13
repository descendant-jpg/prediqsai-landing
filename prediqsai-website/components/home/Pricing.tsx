"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import SectionHeader from "./SectionHeader";
import AcquisitionCta from "@/components/site/AcquisitionCta";
import { APP_STORE_URL, GOOGLE_PLAY_URL, openAppOrStore } from "@/lib/app-links";
import { useAuth } from "@/lib/auth";

const free = ["2 daily picks", "Transparent results record", "Analysis blog access"];
const premium = ["All picks + AI reasoning", "AI chat slip builder", "Arbitrage alerts", "Bankroll tools"];

function FeatureList({ items }: { items: string[] }) {
  return <ul className="mt-7 space-y-3">{items.map((item) => <li key={item} className="flex items-center gap-3 text-sm text-muted"><Check className="h-4 w-4 shrink-0 text-volt" />{item}</li>)}</ul>;
}

export default function Pricing() {
  const { user, loading } = useAuth();
  const tier = (user?.subscriptionTier || user?.tier || "").toLowerCase();
  const activeMembership = !loading && Boolean(user?.isAdmin || tier === "pro" || tier === "premium");

  return (
    <section id="pricing" className="scroll-mt-20 border-b border-edge bg-panel/25 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        {activeMembership ? <div className="mx-auto max-w-3xl">
          <article className="relative overflow-hidden rounded-2xl border border-volt/35 bg-panel/90 p-8 text-center shadow-[0_0_0_1px_rgba(0,230,122,0.08),0_24px_70px_-28px_rgba(0,230,122,0.65)] backdrop-blur-xl sm:p-12">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-volt/15 blur-3xl" />
            <div className="absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-volt/10 blur-3xl" />
            <div className="relative">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-volt">// STATUS</p>
              <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-ice sm:text-5xl">Your Premium Edge is Active</h2>
              <p className="mx-auto mt-5 max-w-2xl leading-7 text-muted">You have full access to our multi-model sports intelligence engine, live arbitrage alerts, and AI reasoning. Open the app to view today&apos;s verified slips.</p>
              <button type="button" onClick={openAppOrStore} className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-volt px-6 py-3.5 text-sm font-semibold text-night transition hover:bg-volt/90">Open in Mobile App <ArrowRight className="h-4 w-4" /></button>
              <p className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs"><a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-muted transition hover:text-volt">Download for iOS</a><a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer" className="text-muted transition hover:text-volt">Download for Android</a></p>
            </div>
          </article>
        </div> : <>
          <SectionHeader eyebrow="simple pricing" title="Start free. Upgrade your edge." description="Explore the data first. Go Premium when you want the full intelligence desk." centered />
          <div className="mt-12 grid items-stretch gap-6 md:grid-cols-2">
            <article className="flex flex-col rounded-2xl border border-edge bg-panel p-7 sm:p-8">
              <p className="font-mono text-xs uppercase tracking-widest text-muted">Free</p>
              <div className="mt-5 font-display text-4xl font-bold">$0</div>
              <p className="mt-2 text-sm text-muted">A clear look at how PrediQs works.</p>
              <FeatureList items={free} />
              <Link href="/results" className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg border border-edge bg-panel-2 px-5 py-3 text-sm font-semibold transition hover:border-muted">View Picks <ArrowRight className="h-4 w-4" /></Link>
            </article>
            <article className="card-glow relative flex flex-col rounded-2xl border border-volt/30 bg-panel p-7 sm:p-8">
              <span className="absolute right-6 top-6 rounded-full bg-volt px-3 py-1 font-mono text-[10px] font-semibold uppercase text-night">Best value</span>
              <p className="font-mono text-xs uppercase tracking-widest text-volt">Premium</p>
              <div className="mt-5 flex items-end gap-2"><span className="font-display text-4xl font-bold">$19.99</span><span className="pb-1 text-sm text-muted">/ month</span></div>
              <p className="mt-2 text-sm text-muted">The full toolkit for serious analysis.</p>
              <FeatureList items={premium} />
              <AcquisitionCta kind="premium" handoffForGuests className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-volt px-5 py-3 text-sm font-semibold text-night transition hover:bg-volt/90">Unlock Premium <ArrowRight className="h-4 w-4" /></AcquisitionCta>
              <p className="mt-3 text-center text-xs text-muted">Cancel anytime.</p>
            </article>
          </div>
        </>}
      </div>
    </section>
  );
}