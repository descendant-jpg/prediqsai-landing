"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export type SettledPick = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchDate: string;
  prediction: string;
  odds: number | null;
  confidence: number | null;
  result: "win" | "loss" | "push";
};

type HistoryResponse = { items: SettledPick[]; page: number; totalPages: number; total: number };
export type SettledStats = { totalGraded: number; wins: number; losses: number; winRate: number };

export function getSettledStats(picks: SettledPick[]): SettledStats {
  const wins = picks.filter((pick) => pick.result.toLowerCase() === "win").length;
  const losses = picks.filter((pick) => pick.result.toLowerCase() === "loss").length;
  return { totalGraded: picks.length, wins, losses, winRate: picks.length ? (wins / picks.length) * 100 : 0 };
}

export function useSettledPredictions() {
  const { token, loading: authLoading } = useAuth();
  const [picks, setPicks] = useState<SettledPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setLoading(true);
    setError(false);

    const load = async () => {
      const first = await apiFetch<HistoryResponse>("/predictions/history?page=1&limit=100", { token });
      const remaining = await Promise.all(
        Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) =>
          apiFetch<HistoryResponse>(`/predictions/history?page=${index + 2}&limit=100`, { token }),
        ),
      );
      return [...first.items, ...remaining.flatMap((page) => page.items)];
    };

    load()
      .then((data) => { if (active) setPicks(data); })
      .catch(() => { if (active) { setError(true); setPicks([]); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authLoading, token, refreshKey]);

  return { picks, stats: getSettledStats(picks), loading: authLoading || loading, error, refresh: () => setRefreshKey((value) => value + 1) };
}