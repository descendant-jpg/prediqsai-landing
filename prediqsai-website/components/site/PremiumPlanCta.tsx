"use client";

import { ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { openAppOrStore } from "@/lib/app-links";
import AcquisitionCta from "./AcquisitionCta";

function hasActiveMembership(user: ReturnType<typeof useAuth>["user"]) {
  const tier = (user?.subscriptionTier || user?.tier || "").toLowerCase();
  return Boolean(user?.isAdmin || tier === "pro" || tier === "premium");
}

export default function PremiumPlanCta({ compact = false }: { compact?: boolean }) {
  const { user, loading } = useAuth();
  const active = !loading && hasActiveMembership(user);

  if (active) {
    return <div className={compact ? "mt-8" : "mt-6"}>
      <span className="flex w-full items-center justify-center rounded-full border border-volt/35 bg-volt/10 px-4 py-3 text-center text-sm font-semibold text-volt">Active Membership</span>
      <button type="button" onClick={openAppOrStore} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-edge px-4 py-3 text-sm font-semibold text-ice transition hover:border-volt/50 hover:text-volt">
        Open Mobile App <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>;
  }

  return <AcquisitionCta kind="premium" className={compact ? "mt-8 block rounded-full bg-volt px-4 py-3 text-center text-sm font-semibold text-night" : "mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-volt px-5 py-3 text-sm font-semibold text-night transition hover:bg-volt/90"}>{compact ? "Start Premium" : "Unlock Premium"}</AcquisitionCta>;
}