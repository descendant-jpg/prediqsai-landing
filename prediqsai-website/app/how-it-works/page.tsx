import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How It Works",
  description: "See how PrediQs AI combines form, head-to-head context, and market movement into transparent football insights.",
};

const steps = [
  ["01", "Read the match context", "We organize relevant form, availability, historical context and market information before a selection is considered."],
  ["02", "Estimate the probability", "Our models turn those signals into a clear probability and risk level — not a promise or a vague hunch."],
  ["03", "Publish and grade", "Every selection stays accountable. Settled picks appear in the public results record, including losses."],
];

export default function HowItWorksPage() {
  return <main className="min-h-screen bg-night"><section className="bg-grid border-b border-edge py-20 sm:py-28"><div className="mx-auto max-w-4xl px-5 text-center sm:px-8"><p className="font-mono text-xs uppercase tracking-[0.2em] text-volt">// THE METHOD</p><h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-6xl">Sports intelligence built for scrutiny.</h1><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted">PrediQs AI helps you understand the evidence behind a match, compare it with the price, and keep a transparent record after the final whistle.</p></div></section><section className="mx-auto max-w-6xl px-5 py-20 sm:px-8"><div className="grid gap-5 md:grid-cols-3">{steps.map(([number,title,body]) => <article key={number} className="rounded-2xl border border-edge bg-panel p-7"><p className="font-mono text-sm text-volt">{number}</p><h2 className="mt-8 font-display text-2xl font-semibold">{title}</h2><p className="mt-4 leading-7 text-muted">{body}</p></article>)}</div><div className="mt-14 rounded-2xl border border-volt/25 bg-panel-2 p-8 text-center"><h2 className="font-display text-2xl font-semibold">Decisions should be clear, not certain.</h2><p className="mx-auto mt-3 max-w-xl text-muted">No model can guarantee a sports result. Use insights responsibly, set limits, and judge performance over a meaningful sample.</p><Link href="/register" className="mt-6 inline-flex rounded-full bg-volt px-5 py-3 text-sm font-semibold text-night">Get started free</Link></div></section></main>;
}
