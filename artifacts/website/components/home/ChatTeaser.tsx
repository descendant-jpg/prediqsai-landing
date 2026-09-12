import Link from "next/link";
import { ArrowRight, Bot, Check, MessageSquareText } from "lucide-react";
import SectionHeader from "./SectionHeader";

export default function ChatTeaser() {
  return (
    <section className="border-b border-edge bg-panel/25 py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
        <div>
          <SectionHeader
            eyebrow="AI slip builder"
            title="Ask for a slip. Get the reasoning."
            description="Turn a plain-language request into a risk-aware bet slip backed by the same analysis engine behind our daily picks."
          />
          <ul className="mt-7 space-y-3 text-sm text-muted">
            {["Set your preferred odds and risk", "Review every leg before acting", "Understand why each market was selected"].map((item) => (
              <li key={item} className="flex items-center gap-3"><span className="rounded-full bg-volt/10 p-1 text-volt"><Check className="h-3 w-3" /></span>{item}</li>
            ))}
          </ul>
          <Link href="/register" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-volt px-5 py-3 font-semibold text-night transition hover:bg-volt/90">
            Try the AI builder <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mx-auto w-full max-w-md rounded-[2rem] border border-edge bg-night p-3 shadow-2xl shadow-black/40">
          <div className="overflow-hidden rounded-[1.45rem] border border-edge bg-panel">
            <div className="flex items-center gap-3 border-b border-edge bg-panel-2 px-5 py-4">
              <div className="rounded-full bg-volt/10 p-2 text-volt"><Bot className="h-5 w-5" /></div>
              <div><p className="text-sm font-semibold">PrediQs AI</p><p className="font-mono text-[10px] uppercase tracking-wider text-volt">Online · Analysis mode</p></div>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-ice px-4 py-3 text-sm leading-6 text-night">
                Build me a cautious 2-odds slip for tonight
              </div>
              <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-edge bg-panel-2 px-4 py-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-volt"><MessageSquareText className="h-4 w-4" />Suggested slip</div>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between gap-4 border-b border-edge pb-3 text-sm"><span><b className="text-ice">Over 1.5 goals</b><small className="mt-1 block text-muted">Northbridge vs City</small></span><span className="font-mono text-ice">1.42</span></div>
                  <div className="flex justify-between gap-4 border-b border-edge pb-3 text-sm"><span><b className="text-ice">Home or draw</b><small className="mt-1 block text-muted">United vs Rovers</small></span><span className="font-mono text-ice">1.45</span></div>
                </div>
                <div className="mt-4 flex items-center justify-between"><span className="text-xs uppercase tracking-wider text-muted">Combined odds</span><span className="font-mono text-lg font-semibold text-volt">2.06</span></div>
              </div>
              <p className="text-center text-[10px] leading-4 text-muted">Product preview. Always review selections and bet responsibly.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}