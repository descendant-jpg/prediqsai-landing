"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Pick = { id: number; homeTeam: string; awayTeam: string; league: string; matchDate: string; prediction: string; odds: number | null; confidence: number | null; result: "win" | "loss" | "push" };
type HistoryResponse = { items: Pick[]; page: number; totalPages: number; total: number };

export default function ResultsTable() {
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    apiFetch<HistoryResponse>(`/predictions/history?page=${page}&limit=15`).then((response) => { if (active) setData(response); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, retry]);

  return <div className="overflow-hidden rounded-2xl border border-edge bg-panel">
    {loading ? <div className="space-y-3 p-5 animate-pulse">{[1,2,3,4,5].map((row) => <div key={row} className="h-12 rounded-lg bg-panel-2" />)}</div> : error ? (
      <div className="p-10 text-center"><p className="font-display text-lg font-semibold text-ice">Results history is temporarily unavailable.</p><button onClick={() => setRetry((value) => value + 1)} className="mt-3 text-sm font-semibold text-volt">Try again</button></div>
    ) : !data?.items.length ? (
      <div className="p-12 text-center"><h2 className="font-display text-xl font-semibold text-ice">No graded picks yet</h2><p className="mt-2 text-sm text-muted">Settled predictions will appear here automatically.</p></div>
    ) : <>
      <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left">
        <thead className="border-b border-edge bg-panel-2 font-mono text-[11px] uppercase tracking-wider text-muted"><tr>{["Date","Match","League","Pick","Odds","Conf %","Result"].map((heading) => <th key={heading} className="px-5 py-4 font-medium">{heading}</th>)}</tr></thead>
        <tbody className="divide-y divide-edge">{data.items.map((pick) => <tr key={pick.id} className="transition hover:bg-panel-2/60">
          <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-muted">{new Date(pick.matchDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td><td className="px-5 py-4 font-medium text-ice">{pick.homeTeam} <span className="text-muted">v</span> {pick.awayTeam}</td><td className="px-5 py-4 text-sm text-muted">{pick.league}</td><td className="px-5 py-4 text-sm text-ice">{pick.prediction}</td><td className="px-5 py-4 font-mono text-sm text-ice">{pick.odds == null ? "—" : pick.odds.toFixed(2)}</td><td className="px-5 py-4 font-mono text-sm text-ice">{pick.confidence == null ? "—" : `${pick.confidence}%`}</td>
          <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase ${pick.result === "win" ? "border-volt/30 bg-volt/10 text-volt" : pick.result === "loss" ? "border-danger/30 bg-danger/10 text-danger" : "border-gold/30 bg-gold/10 text-gold"}`}>{pick.result === "win" ? "Won" : pick.result === "loss" ? "Lost" : "Push"}</span></td>
        </tr>)}</tbody>
      </table></div>
      <div className="flex items-center justify-between border-t border-edge px-5 py-4"><p className="font-mono text-xs text-muted">Page {data.page} of {data.totalPages}</p><div className="flex gap-2"><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-edge p-2 text-ice hover:text-volt disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><button aria-label="Next page" disabled={page >= data.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-edge p-2 text-ice hover:text-volt disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div></div>
    </>}
  </div>;
}
