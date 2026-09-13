import { ArrowRight, Check } from "lucide-react";
import SectionHeader from "./SectionHeader";
import AcquisitionCta from "@/components/site/AcquisitionCta";

const free = ["2 daily picks", "Transparent results record", "Analysis blog access"];
const premium = ["All picks + AI reasoning", "AI chat slip builder", "Arbitrage alerts", "Bankroll tools"];

function FeatureList({ items }: { items: string[] }) {
  return <ul className="mt-7 space-y-3">{items.map((item) => <li key={item} className="flex items-center gap-3 text-sm text-muted"><Check className="h-4 w-4 shrink-0 text-volt" />{item}</li>)}</ul>;
}

export default function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-b border-edge bg-panel/25 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <SectionHeader eyebrow="simple pricing" title="Start free. Upgrade your edge." description="Explore the data first. Go Premium when you want the full intelligence desk." centered />
        <div className="mt-12 grid items-stretch gap-6 md:grid-cols-2">
          <article className="flex flex-col rounded-2xl border border-edge bg-panel p-7 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">Free</p>
            <div className="mt-5 font-display text-4xl font-bold">$0</div>
            <p className="mt-2 text-sm text-muted">A clear look at how PrediQs works.</p>
            <FeatureList items={free} />
            <AcquisitionCta kind="free" className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg border border-edge bg-panel-2 px-5 py-3 text-sm font-semibold transition hover:border-muted">Get started free <ArrowRight className="h-4 w-4" /></AcquisitionCta>
          </article>
          <article className="card-glow relative flex flex-col rounded-2xl border border-volt/30 bg-panel p-7 sm:p-8">
            <span className="absolute right-6 top-6 rounded-full bg-volt px-3 py-1 font-mono text-[10px] font-semibold uppercase text-night">Best value</span>
            <p className="font-mono text-xs uppercase tracking-widest text-volt">Premium</p>
            <div className="mt-5 flex items-end gap-2"><span className="font-display text-4xl font-bold">$19.99</span><span className="pb-1 text-sm text-muted">/ month</span></div>
            <p className="mt-2 text-sm text-muted">The full toolkit for serious analysis.</p>
            <FeatureList items={premium} />
            <AcquisitionCta kind="premium" className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-volt px-5 py-3 text-sm font-semibold text-night transition hover:bg-volt/90">Unlock Premium <ArrowRight className="h-4 w-4" /></AcquisitionCta>
            <p className="mt-3 text-center text-xs text-muted">Cancel anytime.</p>
          </article>
        </div>
      </div>
    </section>
  );
}