import Link from "next/link";
import { format, isValid, parseISO } from "date-fns";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import SectionHeader from "./SectionHeader";

type HistoryPick = {
  homeTeam: string;
  awayTeam: string;
  league: string;
  prediction: string;
  odds: number;
  confidence: number;
  result: string;
  matchDate: string;
};

function dateLabel(value: string) {
  const date = parseISO(value);
  return isValid(date) ? format(date, "MMM d, yyyy") : "Date unavailable";
}

export default async function Transparency() {
  let items: HistoryPick[] = [];
  let failed = false;
  try {
    // Fetch a wider window, then pick 3 with at least one WON and one LOST
    // when available — the section exists to show both, not a lucky streak.
    const data = await apiFetch<{ items: HistoryPick[] }>("/predictions/history?limit=20");
    const graded = (data.items ?? []).filter((item) =>
      ["WON", "LOST"].includes(item.result.toUpperCase()),
    );
    const wins = graded.filter((i) => i.result.toUpperCase() === "WON");
    const losses = graded.filter((i) => i.result.toUpperCase() === "LOST");
    items =
      wins.length > 0 && losses.length > 0
        ? [wins[0], losses[0], ...graded.filter((i) => i !== wins[0] && i !== losses[0])].slice(0, 3)
        : graded.slice(0, 3);
  } catch {
    failed = true;
  }

  return (
    <section className="border-b border-edge py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <SectionHeader eyebrow="radical transparency" title="The record is the product" description="No cherry-picking and no deleted losses. Graded selections stay visible." />
          <Link href="/results" className="hidden shrink-0 items-center gap-2 text-sm font-semibold text-volt hover:text-ice sm:inline-flex">View Full Results Record <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {items.length ? (
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {items.map((item, index) => {
              const won = item.result.toUpperCase() === "WON";
              return (
                <article key={`${item.homeTeam}-${item.awayTeam}-${index}`} className="rounded-xl border border-edge bg-panel p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{item.league}</p>
                    <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold ${won ? "border-volt/30 bg-volt/10 text-volt" : "border-danger/30 bg-danger/10 text-danger"}`}>{won ? "WON" : "LOST"}</span>
                  </div>
                  <h3 className="mt-4 font-display font-semibold">{item.homeTeam} <span className="text-muted">vs</span> {item.awayTeam}</h3>
                  <p className="mt-1 text-xs text-muted">{dateLabel(item.matchDate)}</p>
                  <div className="mt-5 border-t border-edge pt-4">
                    <p className="text-xs text-muted">Pick</p><p className="mt-1 text-sm font-medium">{item.prediction}</p>
                    <div className="mt-4 flex gap-6 font-mono text-xs"><span className="text-muted">Odds <b className="text-ice">{Number(item.odds).toFixed(2)}</b></span><span className="text-muted">Conf. <b className="text-ice">{item.confidence}%</b></span></div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 rounded-xl border border-dashed border-edge bg-panel/50 px-6 py-12 text-center">
            <ClipboardCheck className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-4 font-display text-lg font-semibold">{failed ? "Results are temporarily unavailable" : "Results record starts publishing as picks settle"}</p>
            <p className="mt-2 text-sm text-muted">{failed ? "Please check the full record again shortly." : "Every settled win and loss will remain available for review."}</p>
          </div>
        )}
        <Link href="/results" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-edge bg-panel px-5 py-3 text-sm font-semibold transition hover:border-volt/30 sm:hidden">View Full Results Record <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </section>
  );
}

export function TransparencySkeleton() {
  return <div className="mx-auto max-w-7xl animate-pulse px-5 py-24"><div className="h-10 w-96 max-w-full rounded bg-panel-2" /><div className="mt-10 grid gap-4 md:grid-cols-3"><div className="h-56 rounded-xl bg-panel" /><div className="h-56 rounded-xl bg-panel" /><div className="h-56 rounded-xl bg-panel" /></div></div>;
}