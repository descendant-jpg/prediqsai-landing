import { Activity, History, TrendingUp } from "lucide-react";
import SectionHeader from "./SectionHeader";

const steps = [
  { number: "01", icon: Activity, title: "Form analysis", text: "Recent results, scoring patterns, home-away splits, and squad context are weighed together." },
  { number: "02", icon: History, title: "Head-to-head", text: "Historical matchups reveal repeat patterns, while recent relevance is weighted most heavily." },
  { number: "03", icon: TrendingUp, title: "Odds movement", text: "The model monitors market pricing to identify value and avoid deteriorating positions." },
];

export default function Methodology() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-edge py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader eyebrow="methodology" title="Signal, not gut feeling" description="Every selection passes through a repeatable, evidence-led analysis pipeline." />
        <div className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-4">
            {steps.map(({ number, icon: Icon, title, text }) => (
              <article key={number} className="flex gap-4 rounded-xl border border-edge bg-panel p-5 sm:gap-5 sm:p-6">
                <div className="font-mono text-sm font-semibold text-volt">{number}</div>
                <div>
                  <div className="flex items-center gap-2"><Icon className="h-5 w-5 text-volt" /><h3 className="font-display text-lg font-semibold">{title}</h3></div>
                  <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="rounded-2xl border border-edge bg-panel-2 p-5 sm:p-7">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Demo analysis</p>
            <div className="mt-6 rounded-xl border border-edge bg-night p-5">
              <p className="text-xs text-muted">Premier League · 20:00</p>
              <h3 className="mt-2 font-display text-xl font-semibold">Northbridge FC <span className="text-muted">vs</span> Athletic City</h3>
              <div className="mt-5 border-t border-edge pt-5">
                <p className="text-xs uppercase tracking-wider text-muted">Model selection</p>
                <p className="mt-2 font-semibold">Northbridge — Draw No Bet</p>
                <p className="mt-4 font-mono text-sm text-volt">76% confidence</p>
              </div>
            </div>
            <p className="mt-6 text-xs uppercase tracking-wider text-muted">Visual verdicts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-volt/30 bg-volt/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase text-volt">AI Approved</span>
              <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase text-gold">Value Bet</span>
              <span className="rounded-full border border-danger/30 bg-danger/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase text-danger">Avoid This</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}