import type { Metadata } from "next";
import ResultsTable from "./ResultsTable";

export const metadata: Metadata = { title: "Results", description: "A transparent, continuously updated record of every graded PrediQs AI pick." };

export default function ResultsPage() {
  return <main className="min-h-screen bg-night">
    <section className="border-b border-edge bg-grid"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24"><p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-volt">Verified record</p><h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ice sm:text-6xl">Radical Transparency</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-muted">Every published pick. Every settled result. No selective reporting and no hidden losses.</p></div></section>
    <ResultsTable />
  </main>;
}
