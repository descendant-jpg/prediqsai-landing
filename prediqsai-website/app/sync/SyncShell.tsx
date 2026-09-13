"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, ChevronLeft, ChevronRight, FileText, Globe2, Home, Menu, Plus, Settings, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const links = [
  { href: "/sync", label: "Overview", icon: Home },
  { href: "/sync/articles", label: "Articles", icon: FileText },
  { href: "/sync/articles/new", label: "Add new post", icon: Plus, child: true },
  { href: "/sync/media", label: "Media library", icon: FileText, child: true },
  { href: "/sync/categories", label: "Categories", icon: FileText, child: true },
  { href: "/sync/seo", label: "SEO Suite", icon: Globe2 },
  { href: "/sync/settings", label: "Settings", icon: Settings },
];

export default function SyncShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { if (!loading && (!user || !user.isAdmin)) router.replace("/login"); }, [loading, user, router]);
  useEffect(() => setMobileOpen(false), [pathname]);
  if (loading || !user?.isAdmin) return <div className="flex min-h-screen items-center justify-center bg-night"><div className="h-8 w-8 animate-spin rounded-full border-2 border-edge border-t-volt" /></div>;

  return <div className="min-h-screen bg-[#070b12] text-ice">
    {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-night/80 lg:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={cn("fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/8 bg-[#0b111c] transition-[width,transform] duration-200", collapsed ? "w-[76px]" : "w-64", mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
      <div className="flex h-16 items-center border-b border-white/8 px-5">
        <Link href="/sync" className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-volt text-night"><BarChart3 className="h-4 w-4" /></span>{!collapsed && <span className="font-display text-lg font-bold">PrediQs <span className="text-volt">Sync</span></span>}</Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5">
        {links.map(({ href, label, icon: Icon, child }) => {
          const active = href === "/sync" ? pathname === href : pathname.startsWith(href);
          return <Link key={href} href={href} title={collapsed ? label : undefined} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition", active ? "bg-volt/12 font-semibold text-volt" : "text-muted hover:bg-white/5 hover:text-ice", child && !collapsed && "ml-4 text-xs")}>
            <Icon className={cn("h-4 w-4 shrink-0", active && "text-volt")} />{!collapsed && <span>{label}</span>}
          </Link>;
        })}
      </nav>
      <div className="border-t border-white/8 p-3">
        <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-white/5 hover:text-ice"><ShieldCheck className="h-4 w-4 text-volt" />{!collapsed && "View public site"}</Link>
        <button type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed((v) => !v)} className="mt-1 hidden w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-white/5 hover:text-ice lg:flex">{collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /> Collapse</>}</button>
      </div>
    </aside>
    <div className={cn("transition-[margin] duration-200", collapsed ? "lg:ml-[76px]" : "lg:ml-64")}>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/8 bg-[#070b12]/90 px-5 backdrop-blur lg:px-8"><button type="button" onClick={() => setMobileOpen((v) => !v)} className="rounded-lg border border-edge p-2 text-ice lg:hidden">{mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button><div className="hidden text-xs font-mono uppercase tracking-[.18em] text-muted sm:block">Editorial operations / <span className="text-volt">secure workspace</span></div><div className="flex items-center gap-2"><span className="hidden text-sm text-muted sm:block">{user.displayName || user.email}</span><span className="h-2.5 w-2.5 rounded-full bg-volt shadow-[0_0_10px_#00e67a]" /></div></header>
      {children}
    </div>
  </div>;
}