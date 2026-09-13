"use client";

import { AlertCircle, ClipboardCheck, RefreshCw } from "lucide-react";
import { useSettledPredictions, type SettledPick } from "@/lib/settled-predictions";

function StatusBadge({ result }: { result: SettledPick["result"] }) {
  const style = result === "win" ? "border-volt/45 bg-volt/15 text-volt shadow-[0_0_16px_rgba(0,230,122,0.25)]" : result === "loss" ? "border-danger/35 bg-danger/10 text-danger" : "border-gold/35 bg-gold/10 text-gold";
  return <span className={`inline-flex rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase ${style}`}>{result === "win" ? "Win" : result === "loss" ? "Loss" : "Push"}</span>;
}

function LedgerSkeleton() {
  return <div className="grid animate-pulse gap-4 md:grid-cols-2">{[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-48 rounded-xl border border-edge bg-panel p-6"><div className="h-3 w-24 rounded bg-panel-2" /><div className="mt-5 h-7 w-3/4 rounded bg-panel-2" /><div className="mt-8 h-5 w-full rounded bg-panel-2" /></div>)}</div>;
}

export default function ResultsTable() {
  const { picks, stats, loading, error, refresh } = useSettledPredictions();
  const metrics = [["Win rate", `${stats.winRate.toFixed(1)}%`, "text-volt"], ["Won", String(stats.wins), "text-volt"], ["Lost", String(stats.losses), "text-danger"], ["Total graded", String(stats.totalGraded), "text-ice"]];

  return <>
    <section className="border-b border-edge bg-panel"><div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-edge px-5 sm:px-8 lg:grid-cols-4 lg:divide-y-0">{metrics.map(([label, value, color]) => <div key={label} className="px-4 py-8 sm:px-8 sm:py-10 first:pl-0"><p className={`font-mono text-3xl font-semibold sm:text-5xl ${color}`}>{loading || error ? "—" : value}</p><p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted">{label}</p></div>)}</div></section>
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16"><h2 className="font-display text-2xl font-semibold text-ice sm:text-3xl">Graded picks</h2><p className="mb-6 mt-2 text-sm text-muted">The complete record of settled model predictions.</p>
      {loading ? <LedgerSkeleton /> : error ? <div className="rounded-2xl border border-danger/30 bg-panel p-10 text-center"><AlertCircle className="mx-auto h-8 w-8 text-danger" /><p className="mt-4 font-display text-lg font-semibold text-ice">Results history is temporarily unavailable.</p><button type="button" onClick={refresh} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-volt"><RefreshCw className="h-4 w-4" />Try again</button></div> : !picks.length ? <div className="rounded-2xl border border-dashed border-edge bg-panel/50 p-12 text-center"><ClipboardCheck className="mx-auto h-9 w-9 text-volt" /><h2 className="mt-4 font-display text-xl font-semibold text-ice">Awaiting First Settled Matches</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">The AI&apos;s graded record will populate here once the current fixtures conclude.</p></div> : <div className="grid gap-4 md:grid-cols-2">{picks.map((pick) => <article key={pick.id} className="rounded-xl border border-edge bg-panel p-5 shadow-[0_16px_40px_-30px_rgba(0,0,0,0.9)] transition hover:border-volt/30 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-widest text-muted">{pick.league}</p><h3 className="mt-2 font-display text-xl font-semibold text-ice">{pick.homeTeam} <span className="text-muted">vs</span> {pick.awayTeam}</h3><p className="mt-2 text-xs text-muted">{new Date(pick.matchDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p></div><StatusBadge result={pick.result} /></div><div className="mt-5 rounded-lg border border-edge bg-night/50 p-4"><p className="text-[10px] uppercase tracking-wider text-muted">AI Pick</p><p className="mt-1 font-medium text-ice">{pick.prediction}</p></div><div className="mt-4 grid grid-cols-2 gap-4 font-mono text-xs"><span className="text-muted">Odds <b className="ml-1 text-ice">{pick.odds == null ? "—" : pick.odds.toFixed(2)}</b></span><span className="text-muted">Confidence <b className="ml-1 text-ice">{pick.confidence == null ? "—" : `${pick.confidence}%`}</b></span></div></article>)}</div>}
    </section>
  </>;
}