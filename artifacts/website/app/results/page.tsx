import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import ResultsTable from "./ResultsTable";

export const metadata: Metadata = { title: "Results", description: "A transparent, continuously updated record of every graded PrediQs AI pick." };
type Stats = { totalGraded: number; won: number; lost: number; pushes: number; winRate: number };

export default async function ResultsPage() {
  let stats: Stats | null = null;
  try { stats = await apiFetch<Stats>("/predictions/results"); } catch { stats = null; }
  const hasResults = Boolean(stats?.totalGraded);
  const values = [
    { label: "Win rate", value: hasResults ? `${stats!.winRate}%` : "—", accent: true },
    { label: "Won", value: hasResults ? String(stats!.won) : "—" },
    { label: "Lost", value: hasResults ? String(stats!.lost) : "—" },
    { label: "Total graded", value: hasResults ? String(stats!.totalGraded) : "—" },
  ];
  return <main className="min-h-screen bg-night">
    <section className="border-b border-edge bg-grid"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24"><p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-volt">Verified record</p><h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ice sm:text-6xl">Radical Transparency</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-muted">Every published pick. Every settled result. No selective reporting and no hidden losses.</p></div></section>
    <section className="border-b border-edge bg-panel"><div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-edge px-5 sm:px-8 lg:grid-cols-4 lg:divide-y-0">{values.map((stat) => <div key={stat.label} className="px-4 py-8 sm:px-8 sm:py-10 first:pl-0"><p className={`font-mono text-3xl font-semibold sm:text-5xl ${stat.accent ? "text-volt" : "text-ice"}`}>{stat.value}</p><p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted">{stat.label}</p></div>)}</div></section>
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16"><h2 className="font-display text-2xl font-semibold text-ice sm:text-3xl">Graded picks</h2><p className="mb-6 mt-2 text-sm text-muted">The latest settled model predictions.</p><ResultsTable /></section>
  </main>;
}
