"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, WifiOff } from "lucide-react";
import SectionHeader from "./SectionHeader";
import { useSettledPredictions } from "@/lib/settled-predictions";

function ResultBadge({ result }: { result: "win" | "loss" | "push" }) {
  const styles = result === "win" ? "border-volt/45 bg-volt/15 text-volt shadow-[0_0_16px_rgba(0,230,122,0.3)]" : result === "loss" ? "border-danger/35 bg-danger/10 text-danger" : "border-gold/35 bg-gold/10 text-gold";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase ${styles}`}>{result === "win" ? "WIN" : result === "loss" ? "LOSS" : "PUSH"}</span>;
}

function ResultCardsSkeleton() {
  return <div className="mt-10 grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-5">{[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-52 rounded-xl border border-edge bg-panel p-5"><div className="h-3 w-20 rounded bg-panel-2" /><div className="mt-5 h-6 w-4/5 rounded bg-panel-2" /><div className="mt-8 h-4 w-1/2 rounded bg-panel-2" /></div>)}</div>;
}

export default function Transparency() {
  const { picks, loading, error } = useSettledPredictions();
  const recent = picks.slice(0, 5);
  return <section className="border-b border-edge py-20 sm:py-24">
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
        <SectionHeader eyebrow="radical transparency" title="Recent Graded Picks" description="Every settled prediction stays visible — wins, losses, and everything in between." />
        <Link href="/results" className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-volt hover:text-ice sm:inline-flex">View Full Record <ArrowRight className="h-4 w-4" /></Link>
      </div>
      {loading ? <ResultCardsSkeleton /> : error ? <div className="mt-10 rounded-xl border border-dashed border-edge bg-panel/50 px-6 py-12 text-center"><WifiOff className="mx-auto h-8 w-8 text-muted" /><p className="mt-4 font-display text-lg font-semibold text-ice">Results are temporarily unavailable</p><p className="mt-2 text-sm text-muted">Please check the full record again shortly.</p></div> : !recent.length ? <div className="mt-10 rounded-xl border border-dashed border-edge bg-panel/50 px-6 py-12 text-center"><ClipboardCheck className="mx-auto h-8 w-8 text-muted" /><p className="mt-4 font-display text-lg font-semibold text-ice">Awaiting First Settled Matches</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">The AI&apos;s graded record will populate here once the current fixtures conclude.</p></div> : <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{recent.map((pick) => <article key={pick.id} className="rounded-xl border border-edge bg-panel/85 p-5 shadow-[0_16px_40px_-30px_rgba(0,0,0,0.9)] backdrop-blur transition hover:-translate-y-0.5 hover:border-volt/30"><div className="flex items-center justify-between gap-2"><p className="truncate font-mono text-[10px] uppercase tracking-wider text-muted">{pick.league}</p><ResultBadge result={pick.result} /></div><h3 className="mt-4 font-display text-lg font-semibold leading-snug text-ice">{pick.homeTeam} <span className="text-muted">vs</span> {pick.awayTeam}</h3><p className="mt-2 text-xs text-muted">{new Date(pick.matchDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p><div className="mt-5 border-t border-edge pt-4"><p className="text-[10px] uppercase tracking-wider text-muted">AI Pick</p><p className="mt-1 text-sm font-medium text-ice">{pick.prediction}</p><p className="mt-3 font-mono text-xs text-muted">Odds <span className="text-ice">{pick.odds == null ? "—" : pick.odds.toFixed(2)}</span></p></div></article>)}</div>}
      <Link href="/results" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-edge bg-panel px-5 py-3 text-sm font-semibold text-ice transition hover:border-volt/40 hover:text-volt sm:hidden">View Full Record <ArrowRight className="h-4 w-4" /></Link>
    </div>
  </section>;
}

export function TransparencySkeleton() {
  return <section className="border-b border-edge py-20 sm:py-24"><div className="mx-auto max-w-7xl animate-pulse px-5 sm:px-8"><div className="h-8 w-52 rounded bg-panel-2" /><ResultCardsSkeleton /></div></section>;
}