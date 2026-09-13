import Link from "next/link";
import { ExternalLink, FileCode2, SearchCheck, Share2 } from "lucide-react";

const checks = [
  { title: "Sitemap", description: "All public pages and published posts are indexed in the live XML sitemap.", href: "/sitemap.xml", icon: FileCode2 },
  { title: "Robots policy", description: "Crawlers are allowed on public pages and directed to the XML sitemap.", href: "/robots.txt", icon: SearchCheck },
  { title: "Article sharing", description: "Each article supports a custom Open Graph image and metadata from its editor.", href: "/sync/articles", icon: Share2 },
];

export default function SeoSuitePage() {
  return <main className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10"><p className="font-mono text-xs uppercase tracking-[.2em] text-volt">SEO suite</p><h1 className="mt-2 font-display text-3xl font-bold">Search visibility controls</h1><p className="mt-2 max-w-2xl text-muted">Review the site discovery essentials, then use each article editor to add precise search and sharing metadata.</p>
    <div className="mt-8 grid gap-4 md:grid-cols-3">{checks.map(({ title, description, href, icon: Icon }) => <div key={title} className="flex flex-col rounded-xl border border-white/10 bg-panel p-5"><Icon className="h-5 w-5 text-volt" /><h2 className="mt-5 font-display text-lg font-semibold">{title}</h2><p className="mt-2 flex-1 text-sm leading-6 text-muted">{description}</p><Link href={href} target={href.startsWith("/sync") ? undefined : "_blank"} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-volt hover:text-ice">Open {title}<ExternalLink className="h-3.5 w-3.5" /></Link></div>)}</div>
    <section className="mt-8 rounded-xl border border-white/10 bg-panel p-6"><h2 className="font-display text-xl font-semibold">Per-article SEO checklist</h2><div className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div className="rounded-lg bg-panel-2 p-4"><p className="font-semibold">Search result presentation</p><p className="mt-1.5 leading-6 text-muted">Set a custom meta title and description in the right-hand SEO panel of any article.</p></div><div className="rounded-lg bg-panel-2 p-4"><p className="font-semibold">Social sharing</p><p className="mt-1.5 leading-6 text-muted">Use a dedicated Open Graph image, or use the featured image as the automatic fallback.</p></div></div><Link href="/sync/articles" className="mt-6 inline-flex rounded-lg border border-edge px-4 py-2.5 text-sm font-semibold text-ice hover:border-volt/50 hover:text-volt">Manage articles</Link></section>
  </main>;
}