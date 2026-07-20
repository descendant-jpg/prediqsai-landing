import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  findMatchIdByTeams,
  getH2H,
  getStandings,
  getTeamInfo,
  getWCMatches,
  leagueNameToCode,
} from "../services/football-data";

const router = Router();

const FD_ENABLED = !!process.env.FOOTBALL_DATA_API_KEY;

function notConfigured(res: ReturnType<typeof Router.prototype.use extends () => infer R ? never : never>) {
  return;
}

// GET /api/football-data/status
router.get("/football-data/status", (_req, res) => {
  res.json({ configured: FD_ENABLED });
});

// GET /api/football-data/wc-matches
router.get("/football-data/wc-matches", requireAuth, async (req, res) => {
  if (!FD_ENABLED) {
    res.status(503).json({ error: "Football-Data API not configured", matches: [] });
    return;
  }
  try {
    const matches = await getWCMatches();
    res.json({ matches });
  } catch (err) {
    req.log.error({ err }, "Football-Data WC matches failed");
    res.status(500).json({ error: "Failed to load WC matches", matches: [] });
  }
});

// GET /api/football-data/standings/:code
router.get("/football-data/standings/:code", requireAuth, async (req, res) => {
  if (!FD_ENABLED) {
    res.status(503).json({ error: "Football-Data API not configured", standings: [] });
    return;
  }
  const { code } = req.params as { code: string };
  // Competition codes are short alphanumerics (PL, BL1, CL…). Reject anything
  // else so the param can't inject path segments into the upstream API URL.
  if (!/^[A-Za-z0-9]{2,5}$/.test(code)) {
    res.status(400).json({ error: "Invalid competition code" });
    return;
  }
  try {
    const standings = await getStandings(code.toUpperCase());
    res.json({ standings });
  } catch (err) {
    req.log.error({ err }, "Football-Data standings failed");
    res.status(500).json({ error: "Failed to load standings", standings: [] });
  }
});

// GET /api/football-data/h2h?homeTeam=X&awayTeam=X&league=Premier+League&matchDate=2026-05-23
router.get("/football-data/h2h", requireAuth, async (req, res) => {
  if (!FD_ENABLED) {
    res.status(503).json({ error: "Football-Data API not configured" });
    return;
  }

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
    res.status(404).json({ error: `No Football-Data code for league: ${league}` });
    return;
  }

  try {
    const matchId = await findMatchIdByTeams(code, homeTeam, awayTeam, matchDate);
    if (!matchId) {
      res.status(404).json({ error: "Match not found in Football-Data" });
      return;
    }
    const h2h = await getH2H(matchId, 5);
    res.json(h2h);
  } catch (err) {
    req.log.error({ err }, "Football-Data H2H failed");
    res.status(500).json({ error: "Failed to load H2H data" });
  }
});

// GET /api/football-data/team/:teamId
router.get("/football-data/team/:teamId", requireAuth, async (req, res) => {
  if (!FD_ENABLED) {
    res.status(503).json({ error: "Football-Data API not configured" });
    return;
  }
  const teamId = parseInt(String(req.params.teamId ?? "0"), 10);
  if (!teamId) {
    res.status(400).json({ error: "Invalid teamId" });
    return;
  }
  try {
    const team = await getTeamInfo(teamId);
    res.json(team);
  } catch (err) {
    req.log.error({ err }, "Football-Data team info failed");
    res.status(500).json({ error: "Failed to load team info" });
  }
});

export default router;
