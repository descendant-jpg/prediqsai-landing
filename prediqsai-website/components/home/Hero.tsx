"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import AcquisitionCta from "@/components/site/AcquisitionCta";
import { useSettledPredictions } from "@/lib/settled-predictions";

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 px-3 py-4 text-center sm:px-7">
      <p className="font-mono text-xl font-semibold text-ice sm:text-2xl">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted sm:text-xs">{label}</p>
    </div>
  );
}

export default function Hero() {
  const { stats, loading, error } = useSettledPredictions();

  return (
    <section className="relative isolate overflow-hidden border-b border-edge bg-grid">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_16%,rgba(0,230,122,0.15),transparent_36%)]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-night/30 via-night/70 to-night" />
      <div className="mx-auto flex max-w-7xl flex-col items-center px-5 pb-16 pt-24 text-center sm:px-8 sm:pb-20 sm:pt-32 lg:pt-40">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-volt/25 bg-volt/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-volt">
          <span className="h-1.5 w-1.5 rounded-full bg-volt shadow-[0_0_10px_#00e67a]" />
          AI-powered football intelligence
        </div>
        <h1 className="max-w-5xl font-display text-5xl font-bold leading-[0.98] tracking-[-0.045em] text-ice sm:text-6xl lg:text-8xl">
          Outsmart the Bookies with <span className="text-volt">Predictive AI.</span>
        </h1>
        <p className="mt-7 max-w-2xl text-base leading-7 text-muted sm:text-xl sm:leading-8">
          Turn complex match data into profitable decisions with our multi-model
          sports intelligence engine.
        </p>
        <div className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <AcquisitionCta
            kind="free"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-volt px-6 py-3.5 font-semibold text-night transition hover:bg-volt/90"
          >
            Get Started Free <ArrowRight className="h-4 w-4" />
          </AcquisitionCta>
          <Link
            href="/results"
            className="inline-flex items-center justify-center rounded-lg border border-edge bg-panel/70 px-6 py-3.5 font-semibold text-ice transition hover:border-muted/60 hover:bg-panel-2"
          >
            See Our Results
          </Link>
        </div>

        <div className="mt-14 w-full max-w-3xl overflow-hidden rounded-xl border border-edge bg-panel/85 backdrop-blur">
          <div className="flex items-center gap-2 border-b border-edge px-4 py-2.5 text-left">
            <span className="h-2 w-2 rounded-full bg-danger/70" />
            <span className="h-2 w-2 rounded-full bg-gold/70" />
            <span className="h-2 w-2 rounded-full bg-volt/70" />
            <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-muted">
              verified performance
            </span>
          </div>
          <div className="grid grid-cols-4 divide-x divide-edge">
            <Stat label="Graded" value={loading || error ? "—" : String(stats.totalGraded)} />
            <Stat label="Won" value={loading || error ? "—" : String(stats.wins)} />
            <Stat label="Lost" value={loading || error ? "—" : String(stats.losses)} />
            <Stat
              label="Win rate"
              value={loading || error ? "—" : `${stats.winRate.toFixed(1)}%`}
            />
          </div>
        </div>
        <p className="mt-5 flex items-center gap-2 text-sm text-muted">
          <CheckCircle2 className="h-4 w-4 text-volt" />
          Every pick published. Wins and losses.
        </p>
      </div>
    </section>
  );
}

export function HeroSkeleton() {
  return (
    <section className="border-b border-edge bg-grid px-5 py-32">
      <div className="mx-auto max-w-4xl animate-pulse text-center">
        <div className="mx-auto h-8 w-64 rounded-full bg-panel-2" />
        <div className="mx-auto mt-8 h-20 max-w-3xl rounded-xl bg-panel-2" />
        <div className="mx-auto mt-6 h-6 max-w-xl rounded bg-panel-2" />
        <div className="mx-auto mt-14 h-32 max-w-3xl rounded-xl bg-panel" />
      </div>
    </section>
  );
}