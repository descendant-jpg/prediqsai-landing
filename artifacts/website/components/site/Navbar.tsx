"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Menu, X, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

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

  return (
    <div ref={ref} className="relative">
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
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLang(l.code);
                localStorage.setItem("prediqs_lang", l.code);
                setOpen(false);
              }}
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

export default function Navbar() {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
            <Link
              href={user.isAdmin ? "/admin/blog" : "/results"}
              className="hidden rounded-full border border-edge px-4 py-2 text-sm text-ice transition hover:border-volt/40 sm:block"
            >
              {user.displayName || user.email}
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden text-sm text-muted transition hover:text-ice sm:block"
            >
              Sign In
            </Link>
          )}
          <Link
            href="/register"
            className="rounded-full bg-volt px-4 py-2 text-sm font-semibold text-night transition hover:bg-volt-deep"
          >
            Get Started
          </Link>
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
          </div>
        </div>
      ) : null}
    </header>
  );
}
