"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Globe, LayoutDashboard, LogOut, Menu, ShieldCheck, X, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import AcquisitionCta from "./AcquisitionCta";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#picks", label: "Picks" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/results", label: "Results" },
  { href: "/blog", label: "Blog" },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
  { code: "de", label: "Deutsch" },
  { code: "sw", label: "Kiswahili" },
  { code: "ar", label: "العربية" },
];

function LanguageMenu() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState("en");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("prediqs_lang");
    if (stored) setLang(stored);
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const callbackName = "googleTranslateElementInit";
    type GoogleTranslateWindow = Window & typeof globalThis & {
      google?: {
        translate?: {
          TranslateElement: new (
            options: { pageLanguage: string; includedLanguages: string; autoDisplay: boolean },
            elementId: string,
          ) => unknown;
        };
      };
      googleTranslateElementInit?: () => void;
    };
    const hostWindow = window as GoogleTranslateWindow;
    hostWindow.googleTranslateElementInit = () => {
      if (hostWindow.google?.translate?.TranslateElement) {
        new hostWindow.google.translate.TranslateElement(
          { pageLanguage: "en", includedLanguages: "es,fr,pt,de,sw,ar", autoDisplay: false },
          "google_translate_element",
        );
      }
    };
    if (!document.getElementById("prediqs-google-translate-script")) {
      const script = document.createElement("script");
      script.id = "prediqs-google-translate-script";
      script.src = `https://translate.google.com/translate_a/element.js?cb=${callbackName}`;
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const translate = (code: string) => {
    setLang(code);
    localStorage.setItem("prediqs_lang", code);
    const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (select) {
      select.value = code === "en" ? "" : code;
      select.dispatchEvent(new Event("change"));
    } else {
      document.cookie = code === "en"
        ? "googtrans=; Max-Age=0; path=/"
        : `googtrans=/en/${code}; path=/`;
      window.location.reload();
    }
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div id="google_translate_element" className="google-translate-element" aria-hidden="true" />
      <button
        type="button"
        aria-label="Language"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-edge bg-panel text-muted transition hover:border-volt/40 hover:text-ice"
      >
        <Globe className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-50 w-40 overflow-hidden rounded-xl border border-edge bg-panel shadow-2xl">
          <p className="border-b border-edge px-4 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">Translate page</p>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => translate(l.code)}
              className={cn(
                "block w-full px-4 py-2 text-left text-sm transition hover:bg-panel-2",
                lang === l.code ? "text-volt" : "text-ice",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);
  if (!user) return null;
  const tier = user.subscriptionTier || user.tier || "Free";
  const name = user.displayName || user.username || user.email.split("@")[0];
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open} className="flex items-center gap-2 rounded-full border border-edge bg-panel px-3 py-1.5 text-sm text-ice transition hover:border-volt/50">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-volt/15 font-mono text-xs font-bold text-volt">{name.slice(0, 1).toUpperCase()}</span>
        <span className="hidden max-w-28 truncate sm:block">{name}</span><ChevronDown className="hidden h-3.5 w-3.5 text-muted sm:block" />
      </button>
      {open && <div role="menu" className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-xl border border-edge bg-panel shadow-2xl">
        <div className="border-b border-edge px-4 py-3.5"><p className="truncate font-semibold text-ice">{name}</p><p className="mt-0.5 truncate text-xs text-muted">{user.email}</p><span className="mt-3 inline-flex rounded-full border border-volt/25 bg-volt/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-volt">{tier}</span></div>
        {user.isAdmin && <Link role="menuitem" href="/sync" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-ice transition hover:bg-panel-2"><LayoutDashboard className="h-4 w-4 text-volt" /> Admin dashboard</Link>}
        <button role="menuitem" type="button" onClick={() => { logout(); setOpen(false); window.location.assign("/"); }} className="flex w-full items-center gap-3 border-t border-edge px-4 py-3 text-left text-sm font-semibold text-danger transition hover:bg-danger/10"><LogOut className="h-4 w-4" /> Sign out</button>
      </div>}
    </div>
  );
}

export default function Navbar() {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  if (pathname.startsWith("/sync")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-edge/70 bg-night/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-volt text-night">
              <Zap className="h-4.5 w-4.5" strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              PrediQs <span className="text-volt">AI</span>
            </span>
          </Link>
          <div className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-muted transition hover:text-ice"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageMenu />
          {!loading && user ? (
            <UserMenu />
          ) : (
            <Link
              href="/login"
              className="hidden text-sm text-muted transition hover:text-ice sm:block"
            >
              Sign In
            </Link>
          )}
          <AcquisitionCta kind="free" className="rounded-full bg-volt px-4 py-2 text-sm font-semibold text-night transition hover:bg-volt-deep">Get Started</AcquisitionCta>
          <button
            type="button"
            aria-label="Menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-edge text-ice lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {mobileOpen ? (
        <div className="border-t border-edge bg-night px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2.5 text-sm text-muted transition hover:bg-panel hover:text-ice"
              >
                {l.label}
              </Link>
            ))}
            {!user ? (
              <Link
                href="/login"
                className="rounded-lg px-3 py-2.5 text-sm text-muted transition hover:bg-panel hover:text-ice"
              >
                Sign In
              </Link>
            ) : null}
            {user?.isAdmin ? <Link href="/sync" className="rounded-lg px-3 py-2.5 text-sm text-volt transition hover:bg-panel">Admin dashboard</Link> : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
