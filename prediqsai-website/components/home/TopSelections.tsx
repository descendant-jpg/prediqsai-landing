"use client";

import { format, isValid, parseISO } from "date-fns";
import { ArrowRight, LockKeyhole, Radar } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import SectionHeader from "./SectionHeader";
import AcquisitionCta from "@/components/site/AcquisitionCta";

type Pick = {
  id?: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchDate: string;
  prediction: string;
  confidence: number;
  riskLevel: string;
  reasoning?: string;
  aiProbability?: number;
  bookmakerProbability?: number;
  bestMarket?: string;
  recommendedStake?: string;
  locked?: boolean;
  avoidMatch?: boolean;
};

function kickoff(value: string) {
  const date = parseISO(value);
  return isValid(date) ? format(date, "MMM d · HH:mm") : "Time TBA";
}

function isPaidUser(user: ReturnType<typeof useAuth>["user"]) {
  return Boolean(user?.isAdmin || (user?.subscriptionTier || user?.tier || "").toLowerCase() === "premium");
}

function PickCard({ pick, paid }: { pick: Pick; paid: boolean }) {
  const confidence = Math.max(0, Math.min(100, Number(pick.confidence) || 0));
  const riskProbability = Math.max(0, 100 - confidence);
  const locked = !paid && (pick.locked ?? true);

  return <article className="rounded-xl border border-edge bg-panel p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-volt">{pick.league}</p>
        <h3 className="mt-2 font-display text-xl font-semibold text-ice">{pick.homeTeam} <span className="text-muted">vs</span> {pick.awayTeam}</h3>
      </div>
      <span className="shrink-0 rounded-full border border-edge bg-panel-2 px-2.5 py-1 font-mono text-[10px] uppercase text-muted">{pick.riskLevel || "Rated"}</span>
    </div>
    <p className="mt-2 text-sm text-muted">{kickoff(pick.matchDate)}</p>
    <div className={`mt-5 rounded-lg border border-edge bg-night/60 p-4 ${locked ? "select-none blur-[5px]" : ""}`}>
      <p className="text-xs uppercase tracking-wider text-muted">AI Pick</p>
      <p className="mt-1 font-semibold text-ice">{locked ? "Premium market selection" : pick.prediction}</p>
      {paid && <p className="mt-3 text-sm leading-6 text-muted">{pick.reasoning || "Model reasoning is being finalized for this fixture."}</p>}
    </div>
    {paid ? <div className="mt-5 grid grid-cols-3 gap-3 border-t border-edge pt-4 font-mono text-xs">
      <span className="text-muted">Confidence <b className="mt-1 block text-volt">{confidence}%</b></span>
      <span className="text-muted">Risk <b className="mt-1 block text-ice">{riskProbability}%</b></span>
      <span className="text-muted">Bet code <b className="mt-1 block truncate text-ice">{pick.bestMarket || "AI VERIFIED"}</b></span>
    </div> : <div className="mt-5">
      <div className="flex items-center justify-between font-mono text-xs"><span className="text-muted">Confidence</span><span className={locked ? "blur-[5px] select-none text-volt" : "text-volt"}>{confidence}%</span></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-edge"><div className={`h-full rounded-full bg-volt ${locked ? "blur-[5px]" : ""}`} style={{ width: `${confidence}%` }} /></div>
    </div>}
  </article>;
}

function PicksLoading() {
  return <div className="mt-10 grid animate-pulse gap-5 lg:grid-cols-2">{[0, 1].map((item) => <div key={item} className="h-[276px] rounded-xl border border-edge bg-panel"><div className="m-6 h-4 w-24 rounded bg-panel-2" /><div className="mx-6 mt-5 h-7 w-3/4 rounded bg-panel-2" /><div className="m-6 mt-10 h-20 rounded-lg bg-panel-2" /></div>)}</div>;
}

export default function TopSelections() {
  const { user, token, loading: authLoading } = useAuth();
  const paid = isPaidUser(user);
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setPicks([]);
      return;
    }
    let active = true;
    setPicks(null);
    setFailed(false);
    apiFetch<Pick[]>("/predictions", { token })
      .then((data) => { if (active) setPicks(data.filter((pick) => !pick.avoidMatch).slice(0, 2)); })
      .catch(() => { if (active) { setFailed(true); setPicks([]); } });
    return () => { active = false; };
  }, [authLoading, token]);

  const loading = authLoading || picks === null;
  return <section id="picks" className="scroll-mt-20 border-b border-edge py-20 sm:py-24">
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      <SectionHeader eyebrow="live picks" title="Today’s top selections" description="A preview of the strongest opportunities identified by our analysis engine." />
      {loading ? <PicksLoading /> : picks.length ? <div className="mt-10 grid gap-5 lg:grid-cols-2">{picks.map((pick, index) => <PickCard key={pick.id ?? `${pick.homeTeam}-${pick.awayTeam}-${index}`} pick={pick} paid={paid} />)}</div> : (
        <div className="mt-10 rounded-xl border border-dashed border-edge bg-panel/50 px-6 py-12 text-center">
          {paid ? <Radar className="mx-auto h-9 w-9 text-volt" /> : <LockKeyhole className="mx-auto h-8 w-8 text-muted" />}
          <p className="mt-4 font-display text-lg font-semibold text-ice">{paid ? "AI Engine Processing" : failed ? "Picks are temporarily unavailable" : "Premium selections are member-only"}</p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">{paid ? "Today's premium data and tactical breakdowns will populate here once the confidence threshold is met." : failed ? "Please check back shortly." : "Sign in to preview live fixtures, or open the app to unlock full picks and AI reasoning."}</p>
        </div>
      )}
      {!paid && !loading && <AcquisitionCta kind="premium" handoffForGuests className="mt-6 flex w-full flex-col items-start justify-between gap-5 rounded-xl border border-edge bg-panel-2 p-5 text-left transition hover:border-volt/40 hover:bg-panel sm:flex-row sm:items-center sm:p-6">
        <span className="flex items-center gap-4"><span className="rounded-lg border border-volt/20 bg-volt/10 p-2.5 text-volt"><LockKeyhole className="h-5 w-5" /></span><span><span className="block font-semibold text-ice">Full picks visible to members only</span><span className="mt-1 block text-sm text-muted">Unlock complete analysis and AI reasoning.</span></span></span>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-volt">Unlock picks <ArrowRight className="h-4 w-4" /></span>
      </AcquisitionCta>}
    </div>
  </section>;
}

export function PicksSkeleton() {
  return <section className="border-b border-edge py-20 sm:py-24"><div className="mx-auto max-w-7xl animate-pulse px-5 sm:px-8"><div className="h-8 w-40 rounded bg-panel-2" /><PicksLoading /></div></section>;
}