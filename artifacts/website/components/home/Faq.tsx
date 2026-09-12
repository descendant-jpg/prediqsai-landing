"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import SectionHeader from "./SectionHeader";

const faqs = [
  ["Is it really AI?", "Yes. PrediQs uses statistical and machine-learning models to analyze match data, recent form, head-to-head history, and market movement. AI supports the analysis; it does not remove uncertainty."],
  ["How are picks graded?", "Picks are graded against the published market and match result after settlement. Wins and losses remain in the public results record."],
  ["What does Premium include?", "Premium includes every daily pick with AI reasoning, the chat slip builder, arbitrage alerts, and bankroll management tools."],
  ["Can I cancel anytime?", "Yes. You can cancel your Premium subscription at any time, with access continuing through the end of your current billing period."],
  ["Do you guarantee wins?", "No. No legitimate betting product can guarantee wins. PrediQs provides data-led analysis to support better decisions, but betting always involves risk."],
  ["Which sports and leagues are covered?", "PrediQs is focused on football and covers a growing range of major domestic and international leagues. Available competitions may vary by schedule and data coverage."],
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <SectionHeader eyebrow="faq" title="Questions, answered clearly" centered />
        <div className="mt-12 divide-y divide-edge border-y border-edge">
          {faqs.map(([question, answer], index) => {
            const expanded = open === index;
            return (
              <div key={question}>
                <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : index)} className="flex w-full items-center justify-between gap-6 py-5 text-left font-display font-semibold text-ice">
                  {question}<ChevronDown className={`h-5 w-5 shrink-0 text-muted transition-transform duration-200 ${expanded ? "rotate-180 text-volt" : ""}`} />
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}><div className="overflow-hidden"><p className="max-w-3xl pb-6 text-sm leading-6 text-muted sm:text-base sm:leading-7">{answer}</p></div></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}