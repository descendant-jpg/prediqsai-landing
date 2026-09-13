"use client";

import { Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Settings = { ga4: string; gsc: string; siteUrl: string };
const defaults: Settings = { ga4: "", gsc: "", siteUrl: "https://prediqsai.com" };

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaults); const [saved, setSaved] = useState(false);
  useEffect(() => { const savedSettings = localStorage.getItem("prediqs_sync_settings"); if (savedSettings) setSettings({ ...defaults, ...JSON.parse(savedSettings) }); }, []);
  function save(event: FormEvent) { event.preventDefault(); localStorage.setItem("prediqs_sync_settings", JSON.stringify(settings)); setSaved(true); setTimeout(() => setSaved(false), 2500); }
  const change = (key: keyof Settings, value: string) => setSettings((current) => ({ ...current, [key]: value }));
  return <main className="mx-auto max-w-3xl px-5 py-8 lg:px-8 lg:py-10"><p className="font-mono text-xs uppercase tracking-[.2em] text-volt">Settings</p><h1 className="mt-2 font-display text-3xl font-bold">Site parameters</h1><p className="mt-2 text-muted">Keep your publishing and measurement configuration documented in one place.</p>
    <form onSubmit={save} className="mt-8 rounded-xl border border-white/10 bg-panel p-5 sm:p-7"><div className="space-y-6"><label className="block text-sm font-medium">Public site URL<input type="url" value={settings.siteUrl} onChange={(e) => change("siteUrl", e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-panel-2 px-4 py-3 outline-none focus:border-volt/60" /></label><label className="block text-sm font-medium">GA4 measurement ID<input value={settings.ga4} onChange={(e) => change("ga4", e.target.value)} placeholder="G-XXXXXXXXXX" className="mt-2 w-full rounded-lg border border-white/10 bg-panel-2 px-4 py-3 font-mono text-sm outline-none focus:border-volt/60" /></label><label className="block text-sm font-medium">Google Search Console verification token<input value={settings.gsc} onChange={(e) => change("gsc", e.target.value)} placeholder="Verification token" className="mt-2 w-full rounded-lg border border-white/10 bg-panel-2 px-4 py-3 font-mono text-sm outline-none focus:border-volt/60" /></label></div><p className="mt-6 rounded-lg border border-gold/20 bg-gold/5 px-4 py-3 text-xs leading-5 text-muted">These workspace notes are saved locally for the signed-in editor. To activate GA4 or Search Console in production, set <code className="text-gold">NEXT_PUBLIC_GA_ID</code> and <code className="text-gold">NEXT_PUBLIC_GSC_VERIFICATION</code> in Vercel.</p><button type="submit" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-volt px-5 py-3 text-sm font-bold text-night"><Save className="h-4 w-4" /> {saved ? "Saved locally" : "Save workspace settings"}</button></form>
  </main>;
}