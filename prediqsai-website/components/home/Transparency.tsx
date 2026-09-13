"use client";

import Link from "next/link";
import { ArrowRight, LockKeyhole, Radar } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import SectionHeader from "./SectionHeader";

type ResultsSummary = { totalGraded: number; won: number; lost: number; pushes: number; winRate: number };

function isPaidUser(user: ReturnType<typeof useAuth>["user"]) {
  return Boolean(user?.isAdmin || (user?.subscriptionTier || user?.tier || "").toLowerCase() === "premium");
}

function ResultsLoading() {
  return <div className="mt-10 grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-32 rounded-xl border border-edge bg-panel"><div className="m-5 h-3 w-16 rounded bg-panel-2" /><div className="mx-5 mt-5 h-8 w-12 rounded bg-panel-2" /></div>)}</div>;
}

export default function Transparency() {
  const { user, token, loading: authLoading } = useAuth();
  const paid = isPaidUser(user);
  const [results, setResults] = useState<ResultsSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setResults(null);
    setFailed(false);
    apiFetch<ResultsSummary>("/predictions/results", { token })
      .then((data) => { if (active) setResults(data); })
      .catch(() => { if (active) { setFailed(true); setResults({ totalGraded: 0, won: 0, lost: 0, pushes: 0, winRate: 0 }); } });
    return () => { active = false; };
  }, [authLoading, token]);

  const loading = authLoading || results === null;
  const noSettledResults = !loading && results.totalGraded === 0;
  return <section className="border-b border-edge py-20 sm:py-24">
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
        <SectionHeader eyebrow="radical transparency" title="The record is the product" description="No cherry-picking and no deleted losses. Graded selections stay visible." />
        <Link href="/results" className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-volt hover:text-ice sm:inline-flex">View Full Results Record <ArrowRight className="h-4 w-4" /></Link>
      </div>
      {loading ? <ResultsLoading /> : noSettledResults ? <div className="mt-10 rounded-xl border border-dashed border-edge bg-panel/50 px-6 py-12 text-center">
        {paid ? <Radar className="mx-auto h-9 w-9 text-volt" /> : <LockKeyhole className="mx-auto h-8 w-8 text-muted" />}
        <p className="mt-4 font-display text-lg font-semibold text-ice">{paid ? "AI Engine Processing" : failed ? "Results are temporarily unavailable" : "Results record is pending"}</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">{paid ? "Today's premium data and tactical breakdowns will populate here once the confidence threshold is met." : failed ? "Please check the full record again shortly." : "Settled performance details will appear once today’s picks have been graded."}</p>
      </div> : <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Graded", results.totalGraded, "text-ice"], ["Won", results.won, "text-volt"], ["Lost", results.lost, "text-danger"], ["Win rate", `${Number(results.winRate).toFixed(1)}%`, "text-gold"]].map(([label, value, color]) => <article key={String(label)} className="rounded-xl border border-edge bg-panel p-5"><p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p><p className={`mt-4 font-display text-3xl font-bold ${color}`}>{value}</p></article>)}
      </div>}
      <Link href="/results" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-edge bg-panel px-5 py-3 text-sm font-semibold transition hover:border-volt/30 sm:hidden">View Full Results Record <ArrowRight className="h-4 w-4" /></Link>
    </div>
  </section>;
}

export function TransparencySkeleton() {
  return <section className="border-b border-edge py-20 sm:py-24"><div className="mx-auto max-w-7xl animate-pulse px-5 sm:px-8"><div className="h-8 w-52 rounded bg-panel-2" /><ResultsLoading /></div></section>;
}