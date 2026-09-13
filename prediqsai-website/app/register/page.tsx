"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, UserPlus } from "lucide-react";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.message) as { error?: string };
      return parsed.error || "Unable to create your account.";
    } catch {
      return error.message || "Unable to create your account.";
    }
  }
  return "Unable to create your account. Please try again.";
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await register({ displayName: displayName.trim() || undefined, email: email.trim(), password });
      if (result.needsVerification) {
        setVerification(true);
        setSubmitting(false);
      } else {
        router.push("/");
      }
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  if (verification) {
    return (
      <main className="bg-grid flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-16">
        <section className="card-glow w-full max-w-md rounded-2xl border border-edge bg-panel p-8 text-center">
          <CheckCircle2 className="mx-auto text-volt" size={44} aria-hidden="true" />
          <h1 className="mt-5 font-display text-2xl font-bold text-ice">Check your inbox</h1>
          <p className="mt-3 leading-7 text-muted">Check your inbox to verify your email, then return to sign in.</p>
          <Link href="/login" className="mt-7 inline-flex rounded-lg bg-volt px-5 py-3 font-display text-sm font-bold text-night">
            Go to sign in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-grid flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-16">
      <section className="w-full max-w-md rounded-2xl border border-edge bg-panel p-6 shadow-2xl sm:p-8">
        <UserPlus className="mb-7 text-volt" size={29} aria-hidden="true" />
        <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-volt">Start analyzing</p>
        <h1 className="font-display text-3xl font-bold text-ice">Create your account</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Get data-driven sports intelligence built for sharper decisions.</p>
        {error && <div role="alert" className="mt-6 rounded-lg border border-danger/35 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label className="block text-sm font-medium text-ice">Display name <span className="text-muted">(optional)</span>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="nickname" maxLength={50} className="mt-2 w-full rounded-lg border border-edge bg-panel-2 px-4 py-3 text-ice outline-none focus:border-volt/70 focus:ring-2 focus:ring-volt/10" />
          </label>
          <label className="block text-sm font-medium text-ice">Email
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-edge bg-panel-2 px-4 py-3 text-ice outline-none focus:border-volt/70 focus:ring-2 focus:ring-volt/10" />
          </label>
          <label className="block text-sm font-medium text-ice">Password
            <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-edge bg-panel-2 px-4 py-3 text-ice outline-none focus:border-volt/70 focus:ring-2 focus:ring-volt/10" />
          </label>
          <label className="block text-sm font-medium text-ice">Confirm password
            <input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-2 w-full rounded-lg border border-edge bg-panel-2 px-4 py-3 text-ice outline-none focus:border-volt/70 focus:ring-2 focus:ring-volt/10" />
          </label>
          <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-volt px-5 py-3 font-display text-sm font-bold text-night hover:bg-volt/90 disabled:opacity-60">
            {submitting ? "Creating account..." : "Create account"}{!submitting && <ArrowRight size={17} />}
          </button>
        </form>
        <p className="mt-7 text-center text-sm text-muted">Already registered? <Link href="/login" className="font-semibold text-volt hover:underline">Sign in</Link></p>
      </section>
    </main>
  );
}