import {
  Bot,
  ChartNoAxesCombined,
  CircleDollarSign,
  Radar,
  ScanSearch,
  WalletCards,
} from "lucide-react";
import SectionHeader from "./SectionHeader";

const features = [
  { icon: ChartNoAxesCombined, title: "AI match analysis", text: "Deep analysis of current form, injuries, tactics, and historical performance." },
  { icon: ScanSearch, title: "Value-bet detection", text: "Find where the model’s probability differs meaningfully from the market price." },
  { icon: Bot, title: "AI slip builder", text: "Describe your target and risk level, then get a reasoned multi-leg bet slip." },
  { icon: Radar, title: "Arbitrage scanner", text: "Monitor market discrepancies and surface time-sensitive opportunities." },
  { icon: WalletCards, title: "Bankroll tracker", text: "Keep stakes disciplined with a clear view of exposure and performance." },
  { icon: CircleDollarSign, title: "Live odds movement", text: "Track changing prices to understand where the market is moving." },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-b border-edge bg-panel/25 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader eyebrow="the edge" title="Your complete AI betting desk" description="One focused toolkit for research, value discovery, and disciplined decision-making." centered />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="group rounded-xl border border-edge bg-panel p-6 transition hover:-translate-y-1 hover:border-volt/30">
              <div className="inline-flex rounded-lg border border-edge bg-panel-2 p-3 text-volt transition group-hover:border-volt/30"><Icon className="h-5 w-5" /></div>
              <h3 className="mt-5 font-display text-lg font-semibold text-ice">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}