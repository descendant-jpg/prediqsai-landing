import Link from "next/link";
import { format, isValid, parseISO } from "date-fns";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import SectionHeader from "./SectionHeader";

type Pick = {
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchDate: string;
  prediction: string;
  confidence: number;
  riskLevel: string;
};

function kickoff(value: string) {
  const date = parseISO(value);
  return isValid(date) ? format(date, "MMM d · HH:mm") : "Time TBA";
}

export default async function TopSelections() {
  let picks: Pick[] = [];
  let failed = false;
  try {
    const data = await apiFetch<{ picks: Pick[] }>("/predictions/teaser");
    picks = (data.picks ?? []).slice(0, 2);
  } catch {
    failed = true;
  }

  return (
    <section id="picks" className="scroll-mt-20 border-b border-edge py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader
          eyebrow="live picks"
          title="Today’s top selections"
          description="A preview of the strongest opportunities identified by our analysis engine."
        />
        {picks.length ? (
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {picks.map((pick, index) => {
              const confidence = Math.max(0, Math.min(100, Number(pick.confidence) || 0));
              return (
                <article key={`${pick.homeTeam}-${pick.awayTeam}-${index}`} className="rounded-xl border border-edge bg-panel p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-widest text-volt">{pick.league}</p>
                      <h3 className="mt-2 font-display text-xl font-semibold text-ice">
                        {pick.homeTeam} <span className="text-muted">vs</span> {pick.awayTeam}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-full border border-edge bg-panel-2 px-2.5 py-1 font-mono text-[10px] uppercase text-muted">
                      {pick.riskLevel || "Rated"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">{kickoff(pick.matchDate)}</p>
                  <div className="mt-5 rounded-lg border border-edge bg-night/60 p-4">
                    <p className="text-xs uppercase tracking-wider text-muted">AI Pick</p>
                    <p className="mt-1 font-semibold text-ice">{pick.prediction}</p>
                  </div>
                  <div className="mt-5 flex items-center justify-between font-mono text-xs">
                    <span className="text-muted">Confidence</span>
                    <span className="text-volt">{confidence}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-edge">
                    <div className="h-full rounded-full bg-volt" style={{ width: `${confidence}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 rounded-xl border border-dashed border-edge bg-panel/50 px-6 py-12 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-4 font-display text-lg font-semibold text-ice">
              {failed ? "Picks are temporarily unavailable" : "New picks drop daily"}
            </p>
            <p className="mt-2 text-sm text-muted">
              {failed ? "Please check back shortly." : "The next data-backed selections will appear here."}
            </p>
          </div>
        )}
        <div className="mt-6 flex flex-col items-start justify-between gap-5 rounded-xl border border-edge bg-panel-2 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-lg border border-volt/20 bg-volt/10 p-2.5 text-volt"><LockKeyhole className="h-5 w-5" /></div>
            <div>
              <p className="font-semibold text-ice">Full picks visible to members only</p>
              <p className="mt-1 text-sm text-muted">Unlock complete analysis and AI reasoning.</p>
            </div>
          </div>
          <Link href="/register" className="inline-flex items-center gap-2 text-sm font-semibold text-volt hover:text-ice">
            Unlock picks <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function PicksSkeleton() {
  return <div className="mx-auto max-w-7xl animate-pulse px-5 py-24"><div className="h-10 w-80 rounded bg-panel-2" /><div className="mt-10 grid gap-5 lg:grid-cols-2"><div className="h-64 rounded-xl bg-panel" /><div className="h-64 rounded-xl bg-panel" /></div></div>;
}