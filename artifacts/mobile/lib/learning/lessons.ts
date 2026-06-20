export type LessonSection = {
  heading: string;
  body: string;
  bullets?: string[];
};

export type Lesson = {
  id: string;
  section: "Basics" | "Strategy" | "Advanced" | "Mindset";
  title: string;
  subtitle: string;
  icon: string;
  readMinutes: number;
  intro: string;
  sections: LessonSection[];
  keyTips: string[];
  takeaways: string[];
};

export const LESSON_SECTIONS: Lesson["section"][] = [
  "Basics",
  "Strategy",
  "Advanced",
  "Mindset",
];

export const LESSONS: Lesson[] = [
  // ───────────────────────────── BASICS ─────────────────────────────
  {
    id: "what-is-sports-betting",
    section: "Basics",
    title: "What is Sports Betting?",
    subtitle: "The foundations of wagering on sport",
    icon: "⚽",
    readMinutes: 4,
    intro:
      "Sports betting is the act of placing a wager — a sum of money — on the outcome of a sporting event. If your prediction is correct, you receive a payout based on the odds; if it is wrong, you lose your stake. Underneath that simple idea sits a global, highly competitive industry built on probability, pricing and risk.",
    sections: [
      {
        heading: "How it works at the core",
        body:
          "Every bet has three components: the selection (what you think will happen), the stake (how much you risk) and the odds (the price the bookmaker offers). The bookmaker sets odds that reflect the estimated probability of each outcome, then adds a margin so that, across many customers, they expect to profit. Your job as a thoughtful bettor is to find moments where those odds are wrong in your favour.",
        bullets: [
          "Selection — the outcome you back, e.g. 'Home team to win'",
          "Stake — the money you put at risk on that selection",
          "Odds — the multiplier that determines your potential return",
        ],
      },
      {
        heading: "It is not the same as gambling blindly",
        body:
          "Casino games like roulette have a fixed, mathematically negative expectation — the house always holds an edge you cannot overcome. Sports betting is different because the outcome depends on real-world performance, and the odds are set by humans and algorithms that can make mistakes. This means a disciplined, well-informed bettor can, in theory, find value. It does not mean betting is easy or risk-free — the vast majority of casual bettors lose over time.",
      },
      {
        heading: "The role of the bookmaker",
        body:
          "Bookmakers (also called sportsbooks) are businesses. They build a margin into every market so that the implied probabilities add up to more than 100%. That extra slice — the 'overround' or 'vig' — is their built-in profit. Understanding that you are always betting against a margin is the single most important mental model for a beginner.",
      },
    ],
    keyTips: [
      "Never stake money you cannot comfortably afford to lose.",
      "Treat betting as paid entertainment first, and a potential edge second.",
    ],
    takeaways: [
      "A bet combines a selection, a stake and odds.",
      "Bookmakers build in a margin, so you are always fighting an edge.",
      "Skill and information can create value, but most casual bettors lose long term.",
    ],
  },
  {
    id: "how-betting-odds-work",
    section: "Basics",
    title: "How Betting Odds Work",
    subtitle: "Decimal, fractional and American formats",
    icon: "🔢",
    readMinutes: 5,
    intro:
      "Odds are the language of betting. They tell you two things at once: how much you stand to win, and what probability the market assigns to an outcome. Learning to read all three common formats — and to convert odds into probability — is the foundation of every advanced concept that follows.",
    sections: [
      {
        heading: "The three formats",
        body:
          "Decimal odds (popular in Europe and Australia) show your total return per unit staked, including your stake. Fractional odds (traditional in the UK) show profit relative to stake. American odds (used in the US) use a +/- system around a 100-unit baseline.",
        bullets: [
          "Decimal 2.50 → stake $10 returns $25 total ($15 profit)",
          "Fractional 3/2 → stake $10 returns $15 profit ($25 total)",
          "American +150 → stake $100 wins $150 profit; -150 → stake $150 to win $100",
        ],
      },
      {
        heading: "Converting odds to probability",
        body:
          "Decimal odds make this easy: implied probability = 1 / decimal odds. So odds of 2.00 imply a 50% chance, 4.00 implies 25%, and 1.50 implies about 66.7%. This conversion is the bridge between a price on a screen and what the market actually believes will happen. Once you can do this instantly, you can start judging whether a price is generous or stingy.",
      },
      {
        heading: "Why odds move",
        body:
          "Odds are not fixed. They shift in response to the weight of money coming in, new information such as team news or injuries, and the bookmaker managing their own risk. A price drifting out (getting bigger) suggests the market thinks an outcome is less likely; a price shortening (getting smaller) suggests the opposite.",
      },
    ],
    keyTips: [
      "Memorise the decimal-to-probability formula: 1 / odds.",
      "Pick one odds format and stick with it until conversions feel automatic.",
    ],
    takeaways: [
      "Decimal, fractional and American formats all express the same thing differently.",
      "Implied probability = 1 / decimal odds.",
      "Odds move with money flow and new information.",
    ],
  },
  {
    id: "types-of-bets-explained",
    section: "Basics",
    title: "Types of Bets Explained",
    subtitle: "Singles, multiples, systems and specials",
    icon: "🎟️",
    readMinutes: 5,
    intro:
      "Once you understand odds, the next step is knowing what kinds of bets you can actually place. From the humble single to complex system bets, each type carries a different balance of risk and reward. Choosing the right bet type for a situation is itself a skill.",
    sections: [
      {
        heading: "Singles and multiples",
        body:
          "A single is a bet on one outcome — the simplest and, for most disciplined bettors, the most reliable. A multiple (accumulator or parlay) combines several selections into one bet where every leg must win. Multiples offer big payouts because the odds multiply together, but the probability of winning falls sharply with each added leg.",
        bullets: [
          "Single — one selection",
          "Double — two selections, both must win",
          "Treble — three selections, all must win",
          "Accumulator — four or more selections combined",
        ],
      },
      {
        heading: "Market types within a match",
        body:
          "Beyond who wins, bookmakers offer dozens of markets: total goals (over/under), both teams to score, correct score, handicaps, player props and more. Each market is a different question about the same event, and each has its own pricing and value opportunities.",
      },
      {
        heading: "System bets",
        body:
          "System bets such as Patents, Yankees and Lucky 15s cover multiple combinations of your selections. They cost more because you are effectively placing many bets at once, but they pay out even if not all selections win. They suit bettors who want some insurance against a single leg letting them down.",
      },
    ],
    keyTips: [
      "Beginners should master singles before touching multiples.",
      "Remember: each extra leg in an accumulator slashes your real chance of winning.",
    ],
    takeaways: [
      "Singles are the foundation; multiples trade probability for payout.",
      "A single match offers many different markets to bet on.",
      "System bets spread risk across combinations at a higher cost.",
    ],
  },
  {
    id: "how-to-read-a-betting-slip",
    section: "Basics",
    title: "How to Read a Betting Slip",
    subtitle: "Stake, odds, returns and bet types",
    icon: "🧾",
    readMinutes: 4,
    intro:
      "The betting slip is where your selections, stake and potential return come together. Reading it correctly prevents costly mistakes — like staking the wrong amount or misunderstanding what you actually backed. Every bettor should be able to scan a slip and instantly verify it.",
    sections: [
      {
        heading: "The anatomy of a slip",
        body:
          "A typical slip lists each selection with its market and odds, a field to enter your stake, and an automatically calculated potential return. When you add multiple selections, the slip will offer to combine them as a multiple and show the combined odds.",
        bullets: [
          "Selection & market — what you backed and in which market",
          "Odds — the price for each leg",
          "Stake — the amount you are risking",
          "Potential return — stake plus profit if the bet wins",
        ],
      },
      {
        heading: "Checking before you confirm",
        body:
          "Always verify three things before placing: that the odds shown match what you expected, that your stake is correct, and that the bet type (single vs multiple) is what you intended. A common beginner error is accidentally placing a single combined accumulator instead of separate singles, or vice versa.",
      },
      {
        heading: "Understanding 'price may change'",
        body:
          "Odds can move between adding a selection and confirming the bet. Slips usually have a setting to accept higher odds, lower odds, or any change. Knowing this setting protects you from being surprised by a worse price than you intended to take.",
      },
    ],
    keyTips: [
      "Double-check stake and bet type before every confirmation.",
      "Set your odds-change preference so you are never surprised at settlement.",
    ],
    takeaways: [
      "A slip shows selections, odds, stake and potential return.",
      "Always confirm odds, stake and bet type before placing.",
      "Manage the 'accept odds changes' setting deliberately.",
    ],
  },
  {
    id: "understanding-bookmakers",
    section: "Basics",
    title: "Understanding Bookmakers",
    subtitle: "How sportsbooks make money",
    icon: "🏦",
    readMinutes: 5,
    intro:
      "To beat any game you must first understand who you are playing against. Bookmakers are sophisticated, data-driven companies whose entire business is pricing risk. Knowing how they think, profit and protect themselves changes how you approach every bet.",
    sections: [
      {
        heading: "The overround explained",
        body:
          "If you add up the implied probabilities of every outcome in a fair market, they total 100%. Bookmakers price markets so they total more — often 105% to 110%. That extra percentage is the overround, and it is the mathematical guarantee of their long-term profit. In a two-way market where both sides are truly 50/50, a fair price is 2.00; a bookmaker might offer 1.91 on each side instead.",
      },
      {
        heading: "Balancing the book",
        body:
          "Ideally, a bookmaker takes balanced action on both sides of a market so they profit from the margin regardless of the result. When money piles onto one side, they shift the odds to attract bets on the other side and rebalance their exposure. This is why prices move even when nothing has changed about the teams.",
      },
      {
        heading: "Risk management and limits",
        body:
          "Bookmakers actively manage who they let bet and how much. Winning, sharp customers are often limited or restricted, while losing customers may be offered bonuses to keep playing. Understanding this reality helps you set realistic expectations about how long an edge can be exploited at a single book.",
      },
    ],
    keyTips: [
      "Always compare odds across several bookmakers to reduce the margin you pay.",
      "Expect limits if you consistently win — it is a sign you are doing something right.",
    ],
    takeaways: [
      "The overround is the bookmaker's built-in profit margin.",
      "Odds move as books balance their exposure, not only on new information.",
      "Sportsbooks manage risk by limiting winners and rewarding losers.",
    ],
  },

  // ──────────────────────────── STRATEGY ────────────────────────────
  {
    id: "bankroll-management",
    section: "Strategy",
    title: "Bankroll Management",
    subtitle: "Protecting your capital for the long run",
    icon: "💰",
    readMinutes: 5,
    intro:
      "Bankroll management is the single most important discipline separating bettors who survive from those who go broke. It is not about picking winners — it is about sizing your bets so that a normal losing streak never wipes you out. Even a profitable strategy will fail if you stake too aggressively.",
    sections: [
      {
        heading: "Define your bankroll",
        body:
          "Your bankroll is a dedicated pot of money set aside only for betting — entirely separate from rent, bills and savings. Treating it as a closed system lets you measure performance honestly and removes the emotional pressure of betting with money you need elsewhere.",
      },
      {
        heading: "The unit system",
        body:
          "Professionals bet in 'units' — typically 1% to 3% of their total bankroll per wager. By staking a consistent small percentage, you ensure that no single bet, and no short losing run, can cripple you. As your bankroll grows or shrinks, your unit size adjusts with it, protecting you on the way down and compounding on the way up.",
        bullets: [
          "Conservative: 1% of bankroll per bet",
          "Moderate: 2% per bet",
          "Aggressive: 3% per bet (rarely more)",
        ],
      },
      {
        heading: "Avoiding the spiral",
        body:
          "The fastest way to lose a bankroll is chasing losses — increasing stakes after a loss to 'win it back'. This abandons your sizing rules at the exact moment discipline matters most. A fixed-percentage approach makes chasing structurally impossible if you follow it honestly.",
      },
    ],
    keyTips: [
      "Risk only 1–3% of your bankroll on any single bet.",
      "Never increase stakes to recover losses — that is how bankrolls die.",
    ],
    takeaways: [
      "A bankroll is money set aside exclusively for betting.",
      "Stake a consistent small percentage (1–3%) per bet.",
      "Chasing losses is the number-one cause of ruin.",
    ],
  },
  {
    id: "value-betting-strategy",
    section: "Strategy",
    title: "Value Betting Strategy",
    subtitle: "The only way to profit long term",
    icon: "📈",
    readMinutes: 6,
    intro:
      "Value betting is the heart of profitable wagering. A value bet exists when the odds offered are higher than the true probability of the outcome justifies. Backing the winner is not enough — you must back outcomes that are priced too generously. Over thousands of bets, only value produces profit.",
    sections: [
      {
        heading: "What 'value' really means",
        body:
          "Imagine a fair coin: the true probability of heads is 50%, so fair odds are 2.00. If a bookmaker mistakenly offered 2.20 on heads, you would have a value bet — you would win the same number of times but get paid more than you should. Value is the gap between your assessed probability and the implied probability of the odds.",
      },
      {
        heading: "Finding value in practice",
        body:
          "To find value you need your own probability estimate that is more accurate than the market's. This can come from statistical models, deep specialist knowledge of a niche league, or spotting odds that have not yet adjusted to new information. If your estimated probability beats the implied probability of the price, the bet has positive expected value.",
        bullets: [
          "Estimate the true probability of an outcome",
          "Convert the offered odds to implied probability (1 / odds)",
          "Bet only when your estimate is meaningfully higher",
        ],
      },
      {
        heading: "Discipline over outcomes",
        body:
          "A value bet can still lose — that is variance. The point is that, repeated many times, betting only on value produces profit. This means you must judge your decisions by their quality, not by whether a single bet won. Losing a well-priced bet was still the right decision.",
      },
    ],
    keyTips: [
      "Only bet when your probability estimate beats the implied odds.",
      "Judge decisions by value, not by short-term results.",
    ],
    takeaways: [
      "Value = odds higher than the true probability justifies.",
      "You need a more accurate probability estimate than the market.",
      "Long-term profit comes only from consistently betting value.",
    ],
  },
  {
    id: "the-kelly-criterion",
    section: "Strategy",
    title: "The Kelly Criterion",
    subtitle: "Mathematically optimal bet sizing",
    icon: "🧮",
    readMinutes: 6,
    intro:
      "The Kelly Criterion is a formula that tells you the optimal fraction of your bankroll to stake on a value bet, balancing growth against the risk of ruin. Developed in 1956, it is widely used by professional bettors and investors to maximise long-term bankroll growth.",
    sections: [
      {
        heading: "The formula",
        body:
          "Kelly stake fraction = (bp − q) / b, where b is the decimal odds minus 1 (your net winnings per unit), p is your estimated probability of winning, and q is the probability of losing (1 − p). The result is the percentage of your bankroll the formula recommends staking on that specific bet.",
        bullets: [
          "b = decimal odds − 1",
          "p = your probability of winning",
          "q = 1 − p (probability of losing)",
        ],
      },
      {
        heading: "A worked example",
        body:
          "Suppose you find a bet at odds of 2.50 (so b = 1.5) and you estimate a 50% chance of winning (p = 0.5, q = 0.5). Kelly = (1.5 × 0.5 − 0.5) / 1.5 = (0.75 − 0.5) / 1.5 = 0.167, or about 16.7% of your bankroll. Notice that Kelly only ever recommends a positive stake when the bet has genuine value — if there is no edge, it tells you to bet nothing.",
      },
      {
        heading: "Why most pros use 'fractional Kelly'",
        body:
          "Full Kelly is aggressive and assumes your probability estimates are perfect — which they never are. Because real estimates contain error, most professionals use a fraction of the Kelly stake, such as a half or a quarter. Fractional Kelly sacrifices a little growth for a large reduction in volatility and risk of ruin.",
      },
    ],
    keyTips: [
      "Kelly only recommends a stake when there is real value.",
      "Use half or quarter Kelly to protect against estimation error.",
    ],
    takeaways: [
      "Kelly sizes bets to maximise long-term bankroll growth.",
      "Stake fraction = (bp − q) / b.",
      "Fractional Kelly is safer given imperfect probability estimates.",
    ],
  },
  {
    id: "arbitrage-betting",
    section: "Strategy",
    title: "Arbitrage Betting (ARB)",
    subtitle: "Locking in guaranteed profit",
    icon: "🔁",
    readMinutes: 5,
    intro:
      "Arbitrage betting — 'arbing' — exploits differences in odds between bookmakers to guarantee a profit regardless of the result. By backing every possible outcome at the right prices across different books, you can lock in a small, risk-free return. It sounds like a free lunch, but it carries practical challenges.",
    sections: [
      {
        heading: "How an arb works",
        body:
          "Different bookmakers sometimes price the same event differently. If Book A offers a high price on the home team and Book B offers a high price on the away team, the combined implied probability can fall below 100%. When that happens, staking the correct amount on each outcome guarantees a profit no matter who wins.",
        bullets: [
          "Find an event where combined implied probability < 100%",
          "Calculate stakes so every outcome returns the same total",
          "Place all bets quickly before the odds move",
        ],
      },
      {
        heading: "The practical hurdles",
        body:
          "Arbs are usually small (often 1–3%) and disappear fast as odds move. They require capital spread across many accounts, fast execution, and constant monitoring. Most importantly, bookmakers dislike arbitrageurs and will quickly limit or close accounts that show the pattern, which is the main reason arbing is hard to sustain.",
      },
      {
        heading: "Risks to watch",
        body:
          "Even 'risk-free' arbs carry execution risk: an odds change or a rejected bet can leave you with only one side placed, turning a sure thing into an exposed position. Mistakes in stake calculation or a voided leg can also erase the margin. Precision and speed are everything.",
      },
    ],
    keyTips: [
      "Place every leg as fast as possible to avoid being left exposed.",
      "Expect account limits — arbing is rarely sustainable long term.",
    ],
    takeaways: [
      "Arbing guarantees profit by covering all outcomes across books.",
      "Margins are small and vanish quickly.",
      "Account limits and execution risk are the main obstacles.",
    ],
  },
  {
    id: "hedging-your-bets",
    section: "Strategy",
    title: "Hedging Your Bets",
    subtitle: "Reducing risk and locking in profit",
    icon: "🛡️",
    readMinutes: 5,
    intro:
      "Hedging means placing an additional bet against your original position to reduce risk or guarantee a return. Unlike arbitrage, which is set up for guaranteed profit from the start, hedging is usually a reactive decision made after circumstances change — to protect a profit or limit a potential loss.",
    sections: [
      {
        heading: "When to hedge",
        body:
          "Hedging makes sense when an outcome is in sight and you want to secure value rather than risk it all. A classic case is a long-running accumulator: with one leg remaining and a large potential payout, you might bet against your final selection to guarantee a profit whatever happens.",
        bullets: [
          "Securing profit on a winning accumulator's last leg",
          "Reducing exposure on a large futures bet as the event nears",
          "Locking in value when odds have moved sharply in your favour",
        ],
      },
      {
        heading: "The cost of certainty",
        body:
          "Hedging always reduces your maximum possible payout — you are paying for certainty. The skill is deciding when the guaranteed smaller return is worth more to you than the riskier larger one. This depends on the size of the bet relative to your bankroll and your personal tolerance for variance.",
      },
      {
        heading: "Hedging with exchanges",
        body:
          "Betting exchanges make hedging precise because you can 'lay' (bet against) your original selection at a known price. This lets you calculate exactly how much to stake to either guarantee an equal profit across all outcomes or free up your original stake while letting profit run.",
      },
    ],
    keyTips: [
      "Hedge to protect meaningful profits, not out of fear of every bet.",
      "Exchanges give you precise control over how much to hedge.",
    ],
    takeaways: [
      "Hedging adds an opposing bet to reduce risk or lock in profit.",
      "It trades a larger possible payout for greater certainty.",
      "Exchanges allow exact, calculated hedging via lay bets.",
    ],
  },

  // ──────────────────────────── ADVANCED ────────────────────────────
  {
    id: "expected-value",
    section: "Advanced",
    title: "Expected Value (EV) in Betting",
    subtitle: "The maths behind every good decision",
    icon: "➗",
    readMinutes: 6,
    intro:
      "Expected value (EV) is the average amount a bet would win or lose if it were repeated many times. It is the rigorous, mathematical version of 'value betting'. Every serious bettor frames decisions in terms of EV, because a positive-EV bet is profitable in the long run and a negative-EV bet is not — regardless of how any single bet turns out.",
    sections: [
      {
        heading: "Calculating EV",
        body:
          "EV = (probability of winning × profit if you win) − (probability of losing × stake). If the result is positive, the bet is +EV and worth making; if negative, it is −EV and should be avoided. The formula forces you to be explicit about both your probability estimate and the payout, exposing weak assumptions.",
        bullets: [
          "EV = (P(win) × profit) − (P(lose) × stake)",
          "Positive EV → profitable long term",
          "Negative EV → losing long term",
        ],
      },
      {
        heading: "A worked example",
        body:
          "Say you bet $10 at odds of 2.00 on an outcome you believe has a 55% chance. Profit if you win is $10. EV = (0.55 × $10) − (0.45 × $10) = $5.50 − $4.50 = +$1.00 per bet. That positive expectation means that, repeated thousands of times, this bet makes money even though it loses 45% of the time.",
      },
      {
        heading: "Why EV beats results",
        body:
          "Variance means +EV bets lose constantly in the short term and −EV bets win constantly. This is why amateurs are fooled — a lucky −EV bettor feels like a genius, while a disciplined +EV bettor can endure long droughts. Anchoring to EV keeps you making correct decisions through the noise.",
      },
    ],
    keyTips: [
      "Only place bets you genuinely believe are +EV.",
      "Accept that +EV bets still lose often in the short term.",
    ],
    takeaways: [
      "EV is the average long-term result of a repeated bet.",
      "EV = (P(win) × profit) − (P(lose) × stake).",
      "Decisions should be judged by EV, not by individual outcomes.",
    ],
  },
  {
    id: "asian-handicap",
    section: "Advanced",
    title: "Asian Handicap Explained",
    subtitle: "Removing the draw and splitting stakes",
    icon: "⚖️",
    readMinutes: 6,
    intro:
      "The Asian Handicap is a goals-based handicap system that removes the draw from football betting, leaving just two outcomes and tighter, fairer prices. It can feel confusing at first because of quarter-goal lines that split your stake, but it is one of the most efficient and popular markets among sharp bettors.",
    sections: [
      {
        heading: "Whole and half handicaps",
        body:
          "A handicap gives one team a virtual head start or deficit. With a −1 handicap, your team must win by two or more for the bet to win, and exactly by one results in a push (stake returned). A half-goal line like −0.5 removes the push entirely: the team simply must win.",
        bullets: [
          "−0.5 → team must win",
          "−1.0 → win by 2+ (win by 1 = stake returned)",
          "+1.0 → team can lose by 1 and your stake is returned",
        ],
      },
      {
        heading: "Quarter handicaps",
        body:
          "Lines such as −0.25 or −0.75 split your stake across two adjacent handicaps. A −0.75 bet places half your stake on −0.5 and half on −1.0. This means you can win in full, win half, push half, or lose in full, giving a smoother spread of outcomes than a single line.",
      },
      {
        heading: "Why sharps like it",
        body:
          "Because the draw is removed and lines can be fine-tuned in quarter-goal steps, Asian Handicap markets are highly liquid and carry lower margins than the standard 1X2 market. Lower margins mean better prices, which is exactly what value-focused bettors want.",
      },
    ],
    keyTips: [
      "Quarter lines split your stake — expect half-win and half-loss results.",
      "Asian Handicaps often offer lower margins than 1X2 markets.",
    ],
    takeaways: [
      "Asian Handicaps remove the draw, leaving two outcomes.",
      "Quarter lines split your stake across two handicaps.",
      "Lower margins make them attractive to sharp bettors.",
    ],
  },
  {
    id: "live-in-play-betting",
    section: "Advanced",
    title: "Live / In-Play Betting Strategy",
    subtitle: "Betting as the action unfolds",
    icon: "⏱️",
    readMinutes: 5,
    intro:
      "Live or in-play betting lets you place wagers while an event is happening, with odds updating in real time. It offers unique opportunities to exploit slow-moving prices and react to what you see, but it also amplifies the danger of impulsive, emotional decisions.",
    sections: [
      {
        heading: "The opportunity",
        body:
          "During a match, bookmakers must reprice markets continuously and automatically. They cannot always react instantly or perfectly to momentum, red cards, injuries or tactical shifts. A bettor watching closely can sometimes spot value before the odds catch up — for example, backing a strong favourite that has conceded an early, against-the-run-of-play goal.",
      },
      {
        heading: "The danger",
        body:
          "The speed and constant action of in-play betting make it the easiest format to lose discipline in. Odds flash, the clock ticks, and the temptation to bet on every moment is strong. Without a plan, in-play betting becomes pure impulse — exactly what bookmakers profit from.",
        bullets: [
          "Decide your angles before kickoff, not in the heat of the moment",
          "Set a strict limit on how many in-play bets you will place",
          "Avoid betting simply because the option is there",
        ],
      },
      {
        heading: "Practical discipline",
        body:
          "Successful in-play bettors treat it like a sniper, not a machine gun: they wait patiently for specific, pre-defined situations where they believe the live price is wrong, then strike. Watching the actual game (not just the odds) is essential, because data feeds and odds can lag reality.",
      },
    ],
    keyTips: [
      "Plan your in-play angles before the event starts.",
      "Watch the game itself — odds feeds can lag the real action.",
    ],
    takeaways: [
      "In-play odds update live and can lag real events.",
      "The format magnifies impulsive, emotional betting.",
      "Wait patiently for pre-defined situations rather than betting constantly.",
    ],
  },
  {
    id: "beat-the-bookmaker",
    section: "Advanced",
    title: "How to Beat the Bookmaker",
    subtitle: "Building a genuine, lasting edge",
    icon: "🎯",
    readMinutes: 6,
    intro:
      "Beating the bookmaker over the long term is rare and difficult, but not impossible. It requires abandoning the search for magic tips and instead building a repeatable process grounded in value, discipline and specialisation. This lesson ties the strategic concepts together into a coherent approach.",
    sections: [
      {
        heading: "Specialise to find your edge",
        body:
          "Bookmakers price major markets extremely efficiently, leaving little value. Edges are more often found in niche leagues, lower divisions, women's sport or obscure markets where bookmakers invest less attention. Deep specialist knowledge of a small area can give you better probability estimates than the market.",
      },
      {
        heading: "Get the best price every time",
        body:
          "Because your edge is usually small, the price you take matters enormously. Always line-shop across multiple bookmakers and exchanges, and consider that consistently beating the closing line (the final odds before kickoff) is the strongest evidence that you are genuinely sharp.",
        bullets: [
          "Maintain accounts at several bookmakers",
          "Compare prices before every bet",
          "Track whether you beat the closing line over time",
        ],
      },
      {
        heading: "Process over profit",
        body:
          "Winning bettors fall in love with their process, not their results. They keep detailed records, review decisions honestly, accept that variance will hide their edge for long stretches, and expect to be limited by bookmakers if they succeed. There is no shortcut and no guaranteed system — only disciplined, value-driven repetition.",
      },
    ],
    keyTips: [
      "Specialise in a niche where you can out-think the market.",
      "Beating the closing line consistently proves a real edge.",
    ],
    takeaways: [
      "Edges live in niche, less-efficient markets.",
      "Always take the best available price; track closing-line value.",
      "Long-term success is about process and discipline, not tips.",
    ],
  },
  {
    id: "statistics-for-predictions",
    section: "Advanced",
    title: "Using Statistics for Predictions",
    subtitle: "Turning data into probability",
    icon: "📊",
    readMinutes: 6,
    intro:
      "Statistical analysis is how serious bettors turn raw data into probability estimates that can beat the market. Rather than relying on gut feeling or recent headlines, a statistical approach looks for stable, predictive signals in the numbers — and crucially, knows which numbers actually matter.",
    sections: [
      {
        heading: "Signal versus noise",
        body:
          "Not all stats are useful. A team's recent results are heavily influenced by luck and small sample sizes. Predictive metrics — like expected goals (xG), shot quality and underlying performance — tend to be more stable and forward-looking than raw goals or league position. Learning to separate signal from noise is the core skill.",
        bullets: [
          "Expected goals (xG) — chance quality, more stable than goals",
          "Shot and possession quality, not just quantity",
          "Strength of schedule and home/away splits",
        ],
      },
      {
        heading: "Models and probability",
        body:
          "Bettors often use models — from simple rating systems like Elo to a Poisson distribution for scorelines — to convert data into outcome probabilities. The goal is always the same: produce a probability estimate that is more accurate than the bookmaker's implied probability, which is what creates value.",
      },
      {
        heading: "Respecting uncertainty",
        body:
          "Even the best models are wrong often. Good statistical bettors treat their outputs as probabilities, not predictions, and size their bets accordingly. They continually test their models against real results, discard what does not work, and resist the temptation to overfit to past data that will not repeat.",
      },
    ],
    keyTips: [
      "Favour predictive metrics like xG over raw, noisy results.",
      "Treat model outputs as probabilities, and test them constantly.",
    ],
    takeaways: [
      "Separate predictive signal from random noise in the data.",
      "Models convert statistics into outcome probabilities.",
      "Respect uncertainty and continually validate your approach.",
    ],
  },

  // ───────────────────────────── MINDSET ────────────────────────────
  {
    id: "responsible-gambling",
    section: "Mindset",
    title: "Responsible Gambling",
    subtitle: "Keeping betting safe and in control",
    icon: "🧯",
    readMinutes: 5,
    intro:
      "Responsible gambling is the foundation on which everything else rests. No strategy, edge or system matters if betting harms your finances, relationships or mental health. This lesson is about keeping betting a safe, controlled and enjoyable activity — and recognising when it is not.",
    sections: [
      {
        heading: "Set limits before you start",
        body:
          "Decide in advance how much money and time you are willing to spend, and treat those limits as non-negotiable. Use deposit limits, loss limits and time reminders offered by reputable operators. Limits set with a clear head protect you from decisions made in the heat of a losing session.",
        bullets: [
          "Set a deposit limit you can comfortably afford to lose",
          "Set time limits so betting does not crowd out life",
          "Never bet with money meant for essentials",
        ],
      },
      {
        heading: "Warning signs",
        body:
          "Problem gambling often creeps in gradually. Warning signs include chasing losses, betting more than intended, hiding betting from others, feeling anxious or irritable when not betting, and borrowing money to gamble. Recognising these early is critical, because the behaviour rarely corrects itself.",
      },
      {
        heading: "Where to get help",
        body:
          "If betting stops being fun or starts causing harm, free and confidential help is available. Organisations such as the National Council on Problem Gambling (1-800-522-4700) and GamCare offer support, and reputable operators provide self-exclusion tools. Asking for help is a sign of strength, not failure.",
      },
    ],
    keyTips: [
      "Set deposit, loss and time limits before you begin.",
      "Reach out for help at the first warning sign — support is free and confidential.",
    ],
    takeaways: [
      "Responsible gambling comes before any strategy.",
      "Set firm money and time limits in advance.",
      "Know the warning signs and where to get help.",
    ],
  },
  {
    id: "avoiding-tilt",
    section: "Mindset",
    title: "Avoiding Tilt and Emotional Betting",
    subtitle: "Mastering the mental game",
    icon: "🧘",
    readMinutes: 5,
    intro:
      "'Tilt' is a poker term for the emotional state where frustration overrides rational decision-making, leading to reckless bets. In betting, tilt is the silent bankroll killer — it turns disciplined bettors into impulsive ones, usually right after a bad beat. Managing your emotions is as important as managing your money.",
    sections: [
      {
        heading: "What triggers tilt",
        body:
          "Tilt is usually triggered by a painful loss, a near-miss, or a run of bad luck. The bettor feels a strong urge to 'get it back' immediately, abandoning their staking plan and value criteria. The irony is that tilt strikes hardest precisely when clear thinking matters most.",
        bullets: [
          "A bad beat — losing a bet that looked won",
          "A losing streak that feels personal",
          "Boredom, leading to action for action's sake",
        ],
      },
      {
        heading: "Building defences",
        body:
          "The best defence is a system that does not depend on willpower. Fixed staking removes the option to escalate. A rule to stop after a set number of losses in a day forces a cooling-off period. Stepping away from the screen, even for a few minutes, breaks the emotional momentum that fuels bad bets.",
      },
      {
        heading: "Separating decision from outcome",
        body:
          "The deepest skill is accepting that good decisions sometimes lose. If you bet with genuine value and lost, you did nothing wrong — variance simply happened. Internalising this removes the emotional sting that causes tilt in the first place, letting you keep making correct decisions through the inevitable downswings.",
      },
    ],
    keyTips: [
      "Set a daily stop-loss and walk away when you hit it.",
      "Remember: a well-judged bet that loses was still a good decision.",
    ],
    takeaways: [
      "Tilt is emotional, reckless betting after losses.",
      "Systems and stop-losses defend you better than willpower.",
      "Separate decision quality from short-term outcomes.",
    ],
  },
  {
    id: "setting-realistic-goals",
    section: "Mindset",
    title: "Setting Realistic Goals",
    subtitle: "Expectations that keep you sane",
    icon: "🎯",
    readMinutes: 4,
    intro:
      "Unrealistic expectations destroy bettors. Dreams of getting rich quick lead to oversized stakes, reckless multiples and crushing disappointment. Setting grounded, process-based goals keeps you disciplined, makes betting sustainable, and protects you from the emotional swings that derail decision-making.",
    sections: [
      {
        heading: "Understand realistic returns",
        body:
          "Even excellent professional bettors typically aim for a return on investment of a few percent over the long run. The fantasy of doubling your money every week is exactly that — a fantasy that pushes people into ruinous risk. Modest, compounding returns are what real edges look like.",
      },
      {
        heading: "Focus on process goals",
        body:
          "Outcome goals like 'make $1,000 this month' are largely outside your control because of variance. Process goals are within your control and far healthier: always take the best price, never exceed your unit size, keep accurate records, and review your decisions weekly. Good process produces good outcomes over time.",
        bullets: [
          "Always line-shop for the best odds",
          "Never break your staking rules",
          "Keep detailed records of every bet",
        ],
      },
      {
        heading: "Measure over the long term",
        body:
          "A week, or even a month, tells you almost nothing because variance dominates small samples. Judge your performance over hundreds or thousands of bets. This long horizon keeps you calm during downswings and humble during lucky upswings, both of which are temporary.",
      },
    ],
    keyTips: [
      "Aim for modest, sustainable returns — not overnight riches.",
      "Set goals around process, which you control, not profit, which you don't.",
    ],
    takeaways: [
      "Realistic edges produce small, compounding returns.",
      "Process goals beat outcome goals because you control them.",
      "Judge performance over large samples, not single weeks.",
    ],
  },
  {
    id: "keeping-a-betting-journal",
    section: "Mindset",
    title: "Keeping a Betting Journal",
    subtitle: "What gets measured gets improved",
    icon: "📓",
    readMinutes: 4,
    intro:
      "A betting journal is the most underrated tool in a bettor's arsenal. Without records, you are betting on feelings and memory — both of which lie. A good journal turns vague impressions into hard data, revealing which markets, strategies and habits actually make or lose you money.",
    sections: [
      {
        heading: "What to record",
        body:
          "For every bet, log the date, event, market, selection, odds taken, stake, the bookmaker, your reasoning, and the result. Recording your reasoning is especially powerful, because it lets you review whether your logic was sound regardless of how the bet turned out.",
        bullets: [
          "Date, event and market",
          "Odds, stake and bookmaker",
          "Your reasoning before the result was known",
          "Outcome and profit/loss",
        ],
      },
      {
        heading: "What the data reveals",
        body:
          "Over time, a journal exposes patterns invisible in the moment: maybe you are profitable on singles but lose heavily on accumulators, or strong in one league and weak in another. It also reveals whether you are beating the closing line — the clearest sign of a genuine edge. You can then double down on what works and cut what doesn't.",
      },
      {
        heading: "Honesty is everything",
        body:
          "A journal only helps if it is complete and honest. The temptation to leave out embarrassing losses or tilt bets defeats the entire purpose. The bets you least want to record are usually the ones with the most to teach you. Treat the journal as a mirror, not a highlight reel.",
      },
    ],
    keyTips: [
      "Record your reasoning before you know the result.",
      "Log every bet honestly — especially the ones you regret.",
    ],
    takeaways: [
      "A journal replaces faulty memory with hard data.",
      "It reveals which markets and habits are profitable.",
      "Complete honesty is what makes a journal valuable.",
    ],
  },
  {
    id: "when-to-stop-betting",
    section: "Mindset",
    title: "When to Stop Betting",
    subtitle: "Knowing your limits in the moment",
    icon: "🛑",
    readMinutes: 4,
    intro:
      "Knowing when to stop — within a session, and in general — is a defining skill of a healthy bettor. The ability to walk away protects both your bankroll and your wellbeing. This final mindset lesson is about recognising the moments when the right move is to place no bet at all.",
    sections: [
      {
        heading: "Stop within a session",
        body:
          "Set both a loss limit and, ideally, a win limit before you start, and honour them without exception. Stopping after a defined loss prevents a bad day from becoming a disaster. Stopping after a big win locks in profit before the urge to 'keep the run going' gives it all back. The decision is easy precisely because you made it in advance.",
        bullets: [
          "Set a session loss limit and never exceed it",
          "Consider a win limit to bank good days",
          "Take a break the moment you feel emotional",
        ],
      },
      {
        heading: "Stop when your edge is gone",
        body:
          "Sometimes the right move is to stop betting a market, a league or a strategy entirely. If your journal shows a sustained loss in an area, or a model stops working, walking away is the disciplined choice. Not betting is always a valid and often the most profitable decision.",
      },
      {
        heading: "Stop if it stops being healthy",
        body:
          "Most importantly, stop if betting is no longer fun, is causing stress, or is affecting your life. Taking a break, using self-exclusion tools, or seeking support are all signs of strength. The bettor who can always choose not to bet is the one who stays in control.",
      },
    ],
    keyTips: [
      "Decide your session stop-loss before you place a single bet.",
      "Not betting is a valid, often profitable, decision.",
    ],
    takeaways: [
      "Pre-set loss and win limits, and honour them.",
      "Abandon markets or strategies that have lost their edge.",
      "Always be willing to stop if betting harms your wellbeing.",
    ],
  },
];

export function getLessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function getLessonsBySection(section: Lesson["section"]): Lesson[] {
  return LESSONS.filter((l) => l.section === section);
}
