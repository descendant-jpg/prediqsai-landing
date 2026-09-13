"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Invalid email or password";
    try {
      const parsed = JSON.parse(error.message) as { error?: string };
      return parsed.error || "Unable to sign in. Please try again.";
    } catch {
      return error.message || "Unable to sign in. Please try again.";
    }
  }
  return "Unable to sign in. Please try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      const next = new URLSearchParams(window.location.search).get("next");
      const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : null;
      router.push(user.isAdmin ? "/sync" : safeNext || "/");
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-grid flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-16">
      <section className="w-full max-w-md rounded-2xl border border-edge bg-panel p-6 shadow-2xl sm:p-8">
        <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-xl border border-volt/30 bg-volt/10 text-volt">
          <LockKeyhole size={21} aria-hidden="true" />
        </div>
        <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-volt">Secure access</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ice">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Sign in to access your PrediQs AI account.</p>

        {error && (
          <div role="alert" className="mt-6 rounded-lg border border-danger/35 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <label className="block text-sm font-medium text-ice">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-edge bg-panel-2 px-4 py-3 text-ice outline-none transition placeholder:text-muted/60 focus:border-volt/70 focus:ring-2 focus:ring-volt/10"
              placeholder="you@example.com"
            />
          </label>
          <label className="block text-sm font-medium text-ice">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-edge bg-panel-2 px-4 py-3 text-ice outline-none transition focus:border-volt/70 focus:ring-2 focus:ring-volt/10"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-volt px-5 py-3 font-display text-sm font-bold text-night transition hover:bg-volt/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
            {!submitting && <ArrowRight size={17} aria-hidden="true" />}
          </button>
        </form>
        <p className="mt-7 text-center text-sm text-muted">
          New to PrediQs AI?{" "}
          <Link href="/register" className="font-semibold text-volt hover:underline">Create an account</Link>
        </p>
      </section>
    </main>
  );
}