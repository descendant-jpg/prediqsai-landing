import TelegramBot from "node-telegram-bot-api";

import { logger } from "./lib/logger";
import { getPredictions } from "./services/prediction-engine";

type Prediction = Awaited<ReturnType<typeof getPredictions>>[number];

// ─── Formatting helpers ───────────────────────────────────────────────────────

const SPORT_EMOJI: Record<string, string> = {
  soccer: "⚽",
  nfl:    "🏈",
  nba:    "🏀",
  mlb:    "⚾",
};

const RISK_BADGE: Record<string, string> = {
  low:    "🟢 Low Risk",
  medium: "🟡 Medium Risk",
  high:   "🔴 High Risk",
};

function confBar(pct: number): string {
  const filled = Math.round(pct / 10);
  return "▓".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, 10 - filled)) + ` ${pct}%`;
}

function predLabel(pred: string): string {
  return pred.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function dateLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });
}

function formatPick(p: Prediction, idx: number): string {
  const emoji = SPORT_EMOJI[p.sport] ?? "🎯";
  const risk  = RISK_BADGE[p.riskLevel] ?? "—";

  const lines: string[] = [
    `${emoji} <b>${p.homeTeam} vs ${p.awayTeam}</b>`,
    `📋 <i>${p.league}</i>`,
    `🔮 <b>Pick:</b> ${predLabel(p.prediction)}`,
    `📊 <b>Confidence:</b> ${confBar(p.confidence)}`,
    `⚠️  <b>Risk:</b> ${risk}`,
  ];

  if (p.valueDetected)        lines.push("⚡ <b>Value Bet Detected</b>");
  if (p.isTrapGame)           lines.push("⚠️  <b>Trap Game Warning</b>");
  if (p.avoidMatch)           lines.push(`🚫 <b>AVOID — </b>${p.avoidReason ?? "High-variance match"}`);
  if (p.aiProbability != null) lines.push(`🤖 <b>AI Prob:</b> ${Math.round(p.aiProbability * 100)}%`);

  return lines.join("\n");
}

// ─── Live scores ──────────────────────────────────────────────────────────────

interface ESPNCompetitor {
  team:    { displayName: string };
  score:   string;
  homeAway: string;
}

interface ESPNEvent {
  name:   string;
  status: { type: { name: string; description: string; completed: boolean; shortDetail: string } };
  competitions: Array<{ competitors: ESPNCompetitor[] }>;
}

async function fetchESPNScores(sport: string, league: string): Promise<ESPNEvent[]> {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return [];
    const data  = await res.json() as { events?: ESPNEvent[] };
    return data.events ?? [];
  } catch {
    return [];
  }
}

async function getLiveScores(): Promise<string> {
  const sources = [
    { sport: "football",   league: "nfl",   label: "🏈 NFL"         },
    { sport: "basketball", league: "nba",   label: "🏀 NBA"         },
    { sport: "baseball",   league: "mlb",   label: "⚾ MLB"         },
    { sport: "soccer",     league: "eng.1", label: "⚽ Premier Lg"  },
    { sport: "soccer",     league: "esp.1", label: "⚽ La Liga"     },
    { sport: "soccer",     league: "ger.1", label: "⚽ Bundesliga"  },
  ];

  const lines: string[] = [`📺 <b>Live Scores — ${dateLabel()}</b>\n`];
  let found = 0;

  for (const { sport, league, label } of sources) {
    const events = await fetchESPNScores(sport, league);
    const live = events.filter(
      (e) => !e.status.type.completed && e.status.type.name !== "STATUS_SCHEDULED",
    );
    if (live.length === 0) continue;

    lines.push(`<b>${label}</b>`);
    for (const ev of live.slice(0, 6)) {
      const comp = ev.competitions[0];
      if (!comp) continue;
      const home = comp.competitors.find((c) => c.homeAway === "home");
      const away = comp.competitors.find((c) => c.homeAway === "away");
      if (!home || !away) continue;
      const score  = `${away.team.displayName} <b>${away.score}–${home.score}</b> ${home.team.displayName}`;
      const status = ev.status.type.shortDetail || ev.status.type.description;
      lines.push(`  • ${score}  <i>${status}</i>`);
      found++;
    }
    lines.push("");
  }

  if (found === 0) {
    lines.push("No live games right now ⏰\n\nCheck back during match times!");
  } else {
    lines.push("<i>Data from ESPN</i>");
  }

  return lines.join("\n");
}

// ─── Static message strings ───────────────────────────────────────────────────

const WELCOME = `⚡ <b>Welcome to PrediQs AI!</b>

🤖 Your AI-powered sports intelligence engine — backed by Claude AI and live data from 40+ bookmakers.

📊 <b>What I can do:</b>
• AI picks across NFL, NBA, MLB &amp; Soccer
• Real-time live scores
• ⚡ Value bet detection
• 🚫 Trap game &amp; avoid alerts
• Full confidence analysis

Use /picks to see today's top AI predictions!`;

const HELP = `📖 <b>PrediQs AI — Commands</b>

/picks — Today's top AI predictions
/soccer — Soccer picks ⚽
/nfl — NFL American football picks 🏈
/nba — NBA basketball picks 🏀
/mlb — MLB baseball picks ⚾
/live — Live scores right now 📺
/value — Value bets (AI edge detected) ⚡
/avoid — Trap games to skip 🚫
/premium — Upgrade info ⭐
/help — This help message

💡 <i>Tap any button to get started!</i>`;

const PREMIUM_MSG = `⭐ <b>PrediQs AI Premium — $39.99/mo</b>

Unlock the full AI intelligence platform:

⚽ Unlimited picks — all sports &amp; leagues
🔄 ARB Scanner — 40+ global bookmakers
📄 Slip Analyzer — unlimited slip reviews
🤖 Unlimited Oracle AI chat
📊 Full match detail &amp; H2H stats
📈 Kelly Calculator &amp; ROI charts
🌍 World Cup 2026 full AI coverage
🔔 All alerts &amp; push notifications

💚 <b>Annual plan:</b> $433/yr — save ~10%

📱 Download the PrediQs AI app to upgrade today!`;

// ─── Picks helper ─────────────────────────────────────────────────────────────

const APP_LINK = `https://${process.env.REPLIT_DEV_DOMAIN ?? "prediqsai.replit.app"}`;

async function buildPicksMessage(sport?: string): Promise<string> {
  const all      = await getPredictions();
  const filtered = sport ? all.filter((p) => p.sport === sport) : all;
  const picks    = filtered.filter((p) => !p.avoidMatch).slice(0, 5);

  if (picks.length === 0) {
    return sport
      ? `${SPORT_EMOJI[sport] ?? "🎯"} No ${sport.toUpperCase()} predictions available right now. Check back soon! ⏰`
      : "📊 No predictions available right now. Check back soon! ⏰";
  }

  const label  = sport ? `${SPORT_EMOJI[sport] ?? "🎯"} <b>${sport.toUpperCase()} Picks` : "📊 <b>Today's AI Picks";
  const header = `${label} — ${dateLabel()}</b>\n<i>Powered by Claude AI &amp; live data</i>\n`;
  const sections = picks.map((p, i) => `<b>${i + 1}.</b>\n${formatPick(p, i)}`);
  const footer = `\n\n📱 <i>Full analysis &amp; Kelly Calculator on the app</i>`;

  return header + "\n" + sections.join("\n\n──────────\n\n") + footer;
}

async function buildValueMessage(): Promise<string> {
  const all        = await getPredictions();
  const valuePicks = all.filter((p) => p.valueDetected && !p.avoidMatch).slice(0, 5);

  if (valuePicks.length === 0) {
    return "⚡ No value bets detected right now. Check back later!";
  }

  const header   = `⚡ <b>Value Bets — ${dateLabel()}</b>\n<i>AI detected edge vs bookmaker odds</i>\n`;
  const sections = valuePicks.map((p, i) => `<b>${i + 1}.</b>\n${formatPick(p, i)}`);
  return header + "\n" + sections.join("\n\n──────────\n\n");
}

async function buildAvoidMessage(): Promise<string> {
  const all        = await getPredictions();
  const avoidPicks = all.filter((p) => p.avoidMatch).slice(0, 8);

  if (avoidPicks.length === 0) {
    return "✅ No trap games flagged right now — all clear!";
  }

  const header   = `🚫 <b>Avoid These Games — ${dateLabel()}</b>\n<i>AI flagged as trap games or high-risk</i>\n`;
  const sections = avoidPicks.map((p) => {
    const emoji = SPORT_EMOJI[p.sport] ?? "🎯";
    return `${emoji} <b>${p.homeTeam} vs ${p.awayTeam}</b>\n📋 <i>${p.league}</i>\n🚫 ${p.avoidReason ?? "High variance — skip"}`;
  });
  return header + "\n" + sections.join("\n\n──────────\n\n");
}

// ─── Bot initializer ─────────────────────────────────────────────────────────

export function initTelegramBot(): TelegramBot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn("TELEGRAM_BOT_TOKEN not set — Telegram bot disabled");
    return null;
  }

  const bot = new TelegramBot(token, { polling: true });
  const html = { parse_mode: "HTML" as const };

  const mainKeyboard = {
    inline_keyboard: [
      [{ text: "📊 Today's Picks", callback_data: "picks" }, { text: "📺 Live Scores", callback_data: "live" }],
      [{ text: "⚡ Value Bets",    callback_data: "value" }, { text: "🚫 Avoid List",   callback_data: "avoid" }],
      [{ text: "⭐ Go Premium",    callback_data: "premium" }],
    ],
  };

  // /start
  bot.onText(/\/start/, async (msg) => {
    try {
      await bot.sendMessage(msg.chat.id, WELCOME, {
        ...html, reply_markup: mainKeyboard,
      });
    } catch (err) { logger.error({ err }, "Bot: /start error"); }
  });

  // /help
  bot.onText(/\/help/, async (msg) => {
    try { await bot.sendMessage(msg.chat.id, HELP, html); }
    catch (err) { logger.error({ err }, "Bot: /help error"); }
  });

  // /premium
  bot.onText(/\/premium/, async (msg) => {
    try {
      await bot.sendMessage(msg.chat.id, PREMIUM_MSG, {
        ...html,
        reply_markup: { inline_keyboard: [[{ text: "⭐ Download PrediQs AI App", url: APP_LINK }]] },
      });
    } catch (err) { logger.error({ err }, "Bot: /premium error"); }
  });

  // /picks
  bot.onText(/\/picks/, async (msg) => {
    try {
      await bot.sendChatAction(msg.chat.id, "typing");
      const text = await buildPicksMessage();
      await bot.sendMessage(msg.chat.id, text, {
        ...html,
        reply_markup: { inline_keyboard: [[{ text: "📱 Open PrediQs AI App", url: APP_LINK }]] },
      });
    } catch (err) {
      logger.error({ err }, "Bot: /picks error");
      await bot.sendMessage(msg.chat.id, "⚠️ Failed to load picks. Try again shortly.");
    }
  });

  // /soccer /nfl /nba /mlb
  for (const sport of ["soccer", "nfl", "nba", "mlb"] as const) {
    bot.onText(new RegExp(`\\/${sport}`), async (msg) => {
      try {
        await bot.sendChatAction(msg.chat.id, "typing");
        const text = await buildPicksMessage(sport);
        await bot.sendMessage(msg.chat.id, text, {
          ...html,
          reply_markup: { inline_keyboard: [[{ text: "📱 Open PrediQs AI App", url: APP_LINK }]] },
        });
      } catch (err) {
        logger.error({ err, sport }, `Bot: /${sport} error`);
        await bot.sendMessage(msg.chat.id, `⚠️ Failed to load ${sport.toUpperCase()} picks.`);
      }
    });
  }

  // /value
  bot.onText(/\/value/, async (msg) => {
    try {
      await bot.sendChatAction(msg.chat.id, "typing");
      const text = await buildValueMessage();
      await bot.sendMessage(msg.chat.id, text, html);
    } catch (err) {
      logger.error({ err }, "Bot: /value error");
      await bot.sendMessage(msg.chat.id, "⚠️ Failed to load value bets.");
    }
  });

  // /avoid
  bot.onText(/\/avoid/, async (msg) => {
    try {
      await bot.sendChatAction(msg.chat.id, "typing");
      const text = await buildAvoidMessage();
      await bot.sendMessage(msg.chat.id, text, html);
    } catch (err) {
      logger.error({ err }, "Bot: /avoid error");
      await bot.sendMessage(msg.chat.id, "⚠️ Failed to load avoid picks.");
    }
  });

  // /live
  bot.onText(/\/live/, async (msg) => {
    try {
      await bot.sendChatAction(msg.chat.id, "typing");
      const text = await getLiveScores();
      await bot.sendMessage(msg.chat.id, text, html);
    } catch (err) {
      logger.error({ err }, "Bot: /live error");
      await bot.sendMessage(msg.chat.id, "⚠️ Failed to fetch live scores.");
    }
  });

  // Inline keyboard callbacks
  bot.on("callback_query", async (query) => {
    const chatId = query.message?.chat.id;
    if (!chatId) return;

    try {
      await bot.answerCallbackQuery(query.id);
      await bot.sendChatAction(chatId, "typing");

      switch (query.data) {
        case "picks": {
          const text = await buildPicksMessage();
          await bot.sendMessage(chatId, text, {
            ...html,
            reply_markup: { inline_keyboard: [[{ text: "📱 Open App", url: APP_LINK }]] },
          });
          break;
        }
        case "live": {
          const text = await getLiveScores();
          await bot.sendMessage(chatId, text, html);
          break;
        }
        case "value": {
          const text = await buildValueMessage();
          await bot.sendMessage(chatId, text, html);
          break;
        }
        case "avoid": {
          const text = await buildAvoidMessage();
          await bot.sendMessage(chatId, text, html);
          break;
        }
        case "premium": {
          await bot.sendMessage(chatId, PREMIUM_MSG, {
            ...html,
            reply_markup: { inline_keyboard: [[{ text: "⭐ Download PrediQs AI App", url: APP_LINK }]] },
          });
          break;
        }
      }
    } catch (err) {
      logger.error({ err, data: query.data }, "Bot: callback_query error");
    }
  });

  // Error handling
  bot.on("polling_error", (err) => {
    logger.error({ err }, "Telegram bot polling error");
  });

  bot.on("error", (err) => {
    logger.error({ err }, "Telegram bot error");
  });

  logger.info("✅ Telegram bot started (polling mode) — @prediqsai_bot");
  return bot;
}
