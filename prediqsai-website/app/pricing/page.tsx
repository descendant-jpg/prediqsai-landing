import type { Metadata } from "next";
import AcquisitionCta from "@/components/site/AcquisitionCta";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Compare PrediQs AI Free and Premium plans for transparent football insights, AI analysis and bankroll tools.",
};

const free = ["Two daily AI pick previews", "Public results record", "Free betting guides"];
const premium = ["Every daily pick and analysis", "AI chat slip builder", "Value and arbitrage alerts", "Bankroll performance tools"];

export default function PricingPage() {
  return <main className="min-h-screen bg-night"><section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28"><div className="mx-auto max-w-2xl text-center"><p className="font-mono text-xs uppercase tracking-[0.2em] text-volt">// MEMBERSHIP</p><h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-6xl">Choose your edge.</h1><p className="mt-5 text-lg text-muted">Start with transparent data. Upgrade when you want the full analysis and tools.</p></div><div className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-2"><Plan name="Free" price="$0" items={free} /><Plan name="Premium" price="$19.99" suffix="/ month" items={premium} featured /></div><p className="mx-auto mt-8 max-w-xl text-center text-sm leading-6 text-muted">No betting outcome is guaranteed. Membership provides analysis and tools — please bet responsibly.</p></section></main>;
}
function Plan({name,price,suffix,items,featured=false}:{name:string;price:string;suffix?:string;items:string[];featured?:boolean}) { return <section className={`rounded-2xl border p-8 ${featured ? "border-volt bg-panel-2 card-glow" : "border-edge bg-panel"}`}><p className="font-mono text-xs uppercase tracking-[0.2em] text-volt">{name}</p><p className="mt-6 font-display text-4xl font-bold">{price}<span className="font-body text-base font-normal text-muted">{suffix}</span></p><ul className="mt-7 space-y-3 text-sm text-muted">{items.map(item=><li key={item} className="flex gap-3"><span className="text-volt">✓</span>{item}</li>)}</ul><AcquisitionCta kind={featured ? "premium" : "free"} className={`mt-8 block rounded-full px-4 py-3 text-center text-sm font-semibold ${featured ? "bg-volt text-night" : "border border-edge text-ice"}`}>{featured ? "Start Premium" : "Start free"}</AcquisitionCta></section> }
