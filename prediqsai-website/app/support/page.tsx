import type { Metadata } from "next";
import { Clock3, Globe2, Mail } from "lucide-react";

export const metadata: Metadata = { title: "Support", description: "Get help with your PrediQs AI account, subscription, and predictions." };

const faqs = [
  ["How accurate are the AI predictions?", "Our AI analyses live ESPN data and uses Claude to generate predictions with confidence scores. Win rates vary by sport and market, but our models typically achieve 55–65% accuracy on high-confidence picks. Always use predictions as one data point among many — never as a guarantee."],
  ["How often are predictions updated?", "Predictions are regenerated every 6 hours using live ESPN scoreboard and schedule data. For live matches, the Oracle AI preview provides real-time analysis. You'll see a 'last updated' timestamp on every prediction card."],
  ["What sports does PrediQs AI cover?", "We currently cover NFL, NBA, MLB, and Soccer, including major European leagues and international competitions. World Cup 2026 coverage will expand significantly as the tournament approaches."],
  ["What is the Kelly Criterion calculator?", "The Kelly Criterion calculates the optimal bet size based on your edge and bankroll. Enter bookmaker odds and your estimated win probability to receive a suggested fraction."],
  ["How do I cancel my subscription?", "Subscriptions are managed through the App Store or Google Play Store. Open your device's subscription settings, find PrediQs AI, and select Cancel. Cancellation takes effect at the end of the billing period."],
  ["Is my financial data safe?", "Bankroll data is stored securely with encryption in transit and at rest. We never store bank or payment details — payment processing is handled by Stripe, a PCI-DSS compliant processor."],
  ["What is the difference between Free and Premium?", "Free provides 5 AI predictions per day and basic bankroll tracking. Premium unlocks unlimited predictions, Oracle AI previews, bookmaker odds comparison, full bankroll tools, analytics, and priority assistant access."],
  ["How does the AI assistant work?", "The assistant is powered by Anthropic's Claude model. Ask about team form, value picks, bankroll strategy, rules, or match analysis. It can use your betting history for personalised guidance."],
  ["Can I delete my account?", "Yes. Go to Profile > Delete Account in the app. This permanently removes predictions history, bankroll records, and chats. Alternatively, email support@prediqsai.com."],
  ["I found a bug. How do I report it?", "Email support@prediqsai.com with the bug description, device model, OS version, reproduction steps, and screenshots when possible. We aim to respond within 24–48 hours."],
];

export default function SupportPage() {
  const contacts = [
    { label: "Email support", value: "support@prediqsai.com", href: "mailto:support@prediqsai.com", Icon: Mail },
    { label: "Response time", value: "Within 24–48 hours", Icon: Clock3 },
    { label: "Website", value: "prediqsai.com", href: "https://prediqsai.com", Icon: Globe2 },
  ];
  return <main className="min-h-screen bg-night px-5 py-14 sm:px-8 sm:py-20"><div className="mx-auto max-w-4xl">
    <header className="text-center"><p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-volt">Help centre</p><h1 className="mt-4 font-display text-4xl font-bold text-ice sm:text-5xl">How Can We Help?</h1><p className="mx-auto mt-4 max-w-xl text-muted">Find answers to common questions below, or reach out to us directly.</p></header>
    <div className="my-12 grid gap-4 sm:grid-cols-3">{contacts.map(({ label, value, href, Icon }) => <div key={label} className="rounded-2xl border border-edge bg-panel p-6 text-center"><Icon className="mx-auto h-6 w-6 text-volt" /><p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-muted">{label}</p>{href ? <a className="mt-2 block break-all text-sm font-semibold text-ice hover:text-volt" href={href}>{value}</a> : <p className="mt-2 text-sm font-semibold text-ice">{value}</p>}</div>)}</div>
    <h2 className="mb-5 font-display text-2xl font-semibold text-ice">Frequently Asked Questions</h2>
    <div className="space-y-3">{faqs.map(([question, answer]) => <details key={question} className="group rounded-xl border border-edge bg-panel open:border-volt/30"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold text-ice marker:hidden">{question}<span className="font-mono text-xl font-light text-volt transition group-open:rotate-45">+</span></summary><p className="border-t border-edge px-5 py-4 text-sm leading-7 text-muted">{answer}</p></details>)}</div>
    <section className="mt-12 rounded-2xl border border-edge bg-panel p-6"><h2 className="font-display text-xl font-semibold">Account Deletion</h2><p className="mt-3 leading-7 text-muted">To request deletion of your account and associated data, email us from your registered address at <a href="mailto:support@prediqsai.com" className="font-semibold text-volt">support@prediqsai.com</a>.</p></section>
    <section className="card-glow mt-8 rounded-2xl border border-volt/20 bg-panel-2 p-8 text-center"><h2 className="font-display text-2xl font-semibold">Still have questions?</h2><p className="mt-3 text-muted">Our team will get back to you within 24–48 hours.</p><a href="mailto:support@prediqsai.com" className="mt-6 inline-flex rounded-xl bg-volt px-6 py-3 text-sm font-bold text-night">Contact Support</a><div className="mt-6 rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm text-muted"><strong className="text-gold">Responsible Gambling Support</strong><p className="mt-1">If gambling is causing problems, call the National Problem Gambling Helpline at <a className="text-volt" href="tel:18005224700">1-800-522-4700</a> (24/7, free, confidential).</p></div></section>
  </div></main>;
}
