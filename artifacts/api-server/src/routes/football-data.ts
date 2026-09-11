import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getCachedH2H,
  getCachedMatchIdByTeams,
  getCachedStandings,
  getCachedTeamInfo,
  getCachedWCMatches,
  leagueNameToCode,
} from "../services/football-data";

const router = Router();

const FD_ENABLED = !!process.env.FOOTBALL_DATA_API_KEY;

// GET /api/football-data/status
router.get("/football-data/status", (_req, res) => {
  res.json({ configured: FD_ENABLED });
});

// GET /api/football-data/wc-matches
router.get("/football-data/wc-matches", requireAuth, async (req, res) => {
  try {
    const cached = getCachedWCMatches();
    res.json({
      matches: cached.data,
      cachedAt: cached.cachedAt,
      stale: cached.stale,
      cacheStatus: cached.cacheStatus,
    });
  } catch (err) {
    req.log.error({ err }, "Football-Data WC matches failed");
    res.status(500).json({ error: "Failed to load WC matches", matches: [] });
  }
});

// GET /api/football-data/standings/:code
router.get("/football-data/standings/:code", requireAuth, async (req, res) => {
  const { code } = req.params as { code: string };
  // Competition codes are short alphanumerics (PL, BL1, CL…). Reject anything
  // else so the param can't inject path segments into the upstream API URL.
  if (!/^[A-Za-z0-9]{2,5}$/.test(code)) {
    res.status(400).json({ error: "Invalid competition code" });
    return;
  }
  try {
    const cached = getCachedStandings(code.toUpperCase());
    res.json({ standings: cached.data, cachedAt: cached.cachedAt, stale: cached.stale, cacheStatus: cached.cacheStatus });
  } catch (err) {
    req.log.error({ err }, "Football-Data standings failed");
    res.status(500).json({ error: "Failed to load standings", standings: [] });
  }
});

// GET /api/football-data/h2h?homeTeam=X&awayTeam=X&league=Premier+League&matchDate=2026-05-23
router.get("/football-data/h2h", requireAuth, async (req, res) => {
  const { homeTeam, awayTeam, league, matchDate } = req.query as {
    homeTeam?: string;
    awayTeam?: string;
    league?: string;
    matchDate?: string;
  };

  if (!homeTeam || !awayTeam || !league || !matchDate) {
    res.status(400).json({ error: "homeTeam, awayTeam, league, matchDate required" });
    return;
  }

  const code = leagueNameToCode(league);
  if (!code) {
    res.json({
      homeTeamWins: 0,
      awayTeamWins: 0,
      draws: 0,
      meetings: [],
      available: false,
      cachedAt: null,
      stale: false,
      cacheStatus: "empty",
    });
    return;
  }

  try {
    const matchId = getCachedMatchIdByTeams(code, homeTeam, awayTeam, matchDate);
    if (!matchId.data) {
      res.json({
        homeTeamWins: 0,
        awayTeamWins: 0,
        draws: 0,
        meetings: [],
        available: false,
        cachedAt: null,
        stale: false,
        cacheStatus: "empty",
      });
      return;
    }
    const h2h = getCachedH2H(matchId.data, 5);
    if (!h2h.data) {
      res.json({
        homeTeamWins: 0,
        awayTeamWins: 0,
        draws: 0,
        meetings: [],
        available: false,
        cachedAt: null,
        stale: false,
        cacheStatus: "empty",
      });
      return;
    }
    res.json({ ...h2h.data, available: true, cachedAt: h2h.cachedAt, stale: h2h.stale, cacheStatus: h2h.cacheStatus });
  } catch (err) {
    req.log.error({ err }, "Football-Data H2H failed");
    res.status(500).json({ error: "Failed to load H2H data" });
  }
});

// GET /api/football-data/team/:teamId
router.get("/football-data/team/:teamId", requireAuth, async (req, res) => {
  const teamId = parseInt(String(req.params.teamId ?? "0"), 10);
  if (!teamId) {
    res.status(400).json({ error: "Invalid teamId" });
    return;
  }
  try {
    const team = getCachedTeamInfo(teamId);
    if (!team.data) {
      res.json({
        id: teamId,
        name: "",
        crest: "",
        venue: "",
        founded: null,
        clubColors: null,
        coach: null,
        squad: [],
        available: false,
        cachedAt: null,
        stale: false,
        cacheStatus: "empty",
      });
      return;
    }
    res.json({ ...team.data, available: true, cachedAt: team.cachedAt, stale: team.stale, cacheStatus: team.cacheStatus });
  } catch (err) {
    req.log.error({ err }, "Football-Data team info failed");
    res.status(500).json({ error: "Failed to load team info" });
  }
});

export default router;
