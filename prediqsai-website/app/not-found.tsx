import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-sm text-volt">404</p>
      <h1 className="font-display text-3xl font-bold">Page not found</h1>
      <p className="text-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/"
        className="rounded-full bg-volt px-5 py-2.5 text-sm font-semibold text-night transition hover:bg-volt-deep"
      >
        Back to home
      </Link>
    </div>
  );
}
