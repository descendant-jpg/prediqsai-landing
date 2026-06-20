export type QuizLevel = "Casual" | "Intermediate" | "Advanced" | "Professional";

export type QuizQuestion = {
  question: string;
  options: string[];
  /** index into options of the correct answer */
  correct: number;
};

export type QuizLevelMeta = {
  level: QuizLevel;
  emoji: string;
  color: string;
  subtitle: string;
};

export const QUIZ_LEVELS: QuizLevelMeta[] = [
  { level: "Casual",       emoji: "🟢", color: "#00FF94", subtitle: "Perfect for beginners" },
  { level: "Intermediate", emoji: "🟡", color: "#FFD700", subtitle: "Test your knowledge" },
  { level: "Advanced",     emoji: "🟠", color: "#FF6B35", subtitle: "Challenge yourself" },
  { level: "Professional", emoji: "🔴", color: "#FF4D4D", subtitle: "For serious bettors" },
];

export const QUIZZES: Record<QuizLevel, QuizQuestion[]> = {
  Casual: [
    {
      question: 'What does "odds" mean in betting?',
      options: ["Price of a bet", "Team name", "Match score", "Bet limit"],
      correct: 0,
    },
    {
      question: 'What is a "stake"?',
      options: ["Winnings", "Amount you bet", "The odds", "A draw"],
      correct: 1,
    },
    {
      question: 'What does "1X2" mean?',
      options: ["Home/Draw/Away", "Score prediction", "Number of goals", "Time of match"],
      correct: 0,
    },
    {
      question: "If odds are 2.0 and you bet $10, what do you win?",
      options: ["$5", "$10", "$20", "$25"],
      correct: 2,
    },
    {
      question: 'What is an "accumulator"?',
      options: ["Single bet", "Multiple bets combined", "A refund", "A free bet"],
      correct: 1,
    },
    {
      question: 'What does "FT" mean?',
      options: ["Free Transfer", "Full Time", "First Team", "Fast Track"],
      correct: 1,
    },
    {
      question: 'What is a "draw" result coded as in 1X2?',
      options: ["1", "2", "X", "D"],
      correct: 2,
    },
    {
      question: 'What does "cash out" mean?',
      options: ["Withdraw account", "Settle bet early", "Add funds", "Place new bet"],
      correct: 1,
    },
    {
      question: 'What is a "free bet"?',
      options: ["A no-cost wager offered by bookmaker", "A guaranteed win", "A refund", "A bonus goal"],
      correct: 0,
    },
    {
      question: 'What does "over/under" mean?',
      options: ["Team performance", "Total goals above/below a number", "Halftime score", "Red cards"],
      correct: 1,
    },
  ],
  Intermediate: [
    {
      question: 'What is "value betting"?',
      options: [
        "Betting on favourites",
        "Finding odds higher than true probability",
        "Betting low stakes",
        "Avoiding accumulators",
      ],
      correct: 1,
    },
    {
      question: 'What does "implied probability" mean?',
      options: [
        "Chance bookmaker assigns to outcome",
        "Your personal prediction",
        "Historical win rate",
        "Form guide",
      ],
      correct: 0,
    },
    {
      question: "If odds are 3.5, what is the implied probability?",
      options: ["35%", "28.6%", "40%", "22%"],
      correct: 1,
    },
    {
      question: 'What is "handicap betting"?',
      options: [
        "Betting on injured players",
        "Giving one team a virtual advantage/disadvantage",
        "Betting without odds",
        "Live betting",
      ],
      correct: 1,
    },
    {
      question: 'What does "each way" betting mean?',
      options: ["Bet on both teams", "Bet to win and place", "Bet on every match", "Refundable bet"],
      correct: 1,
    },
    {
      question: 'What is "line movement"?',
      options: ["Betting queue", "Change in odds over time", "Score update", "Team formation"],
      correct: 1,
    },
    {
      question: 'What does "juice/vig" mean?',
      options: ["Bookmaker's commission", "Bonus payout", "Live odds", "Minimum stake"],
      correct: 0,
    },
    {
      question: 'What is a "patent" bet?',
      options: [
        "3 singles + 3 doubles + 1 treble",
        "4 selections combined",
        "Single bet",
        "System bet with 2 teams",
      ],
      correct: 0,
    },
    {
      question: 'What is "closing line value"?',
      options: ["Final score", "Beating the odds at market close", "Last minute goal", "Bet settlement"],
      correct: 1,
    },
    {
      question: 'What does "steam move" mean?',
      options: [
        "Hot weather betting",
        "Sharp money causing rapid odds movement",
        "Live in-play bet",
        "Accumulator win",
      ],
      correct: 1,
    },
  ],
  Advanced: [
    {
      question: "What is the Kelly Criterion used for?",
      options: ["Picking teams", "Optimal bet sizing based on edge", "Calculating odds", "Tracking results"],
      correct: 1,
    },
    {
      question: 'What is "arbitrage betting"?',
      options: [
        "Betting on draws",
        "Guaranteed profit by covering all outcomes across bookmakers",
        "Avoiding losses",
        "Hedging single bets",
      ],
      correct: 1,
    },
    {
      question: 'What does "CLV" stand for?',
      options: ["Closing Line Value", "Current Live Value", "Calculated Loss Variation", "Core Leverage Value"],
      correct: 0,
    },
    {
      question: 'What is "positive expected value (+EV)"?',
      options: ["Winning streak", "Long-term profitable bet", "Bonus promotion", "Double odds"],
      correct: 1,
    },
    {
      question: 'What is a "dutching" strategy?',
      options: [
        "Betting on Dutch teams",
        "Staking multiple selections so any win yields same profit",
        "Avoiding bookmakers",
        "System betting",
      ],
      correct: 1,
    },
    {
      question: 'What is "regression to the mean" in betting?',
      options: [
        "Losing streak ending",
        "Performance returning to average over time",
        "Odds lowering",
        "Team form improving",
      ],
      correct: 1,
    },
    {
      question: 'What does "market efficiency" mean?',
      options: [
        "Fast payouts",
        "Odds accurately reflecting true probabilities",
        "Good customer service",
        "Low margins",
      ],
      correct: 1,
    },
    {
      question: 'What is "middling"?',
      options: [
        "Betting at half time",
        "Profiting when final result lands between two line bets",
        "Averaging stakes",
        "Bet hedging",
      ],
      correct: 1,
    },
    {
      question: 'What is a "sharp bettor"?',
      options: [
        "Quick bettor",
        "Professional, data-driven bettor respected by bookmakers",
        "Lucky bettor",
        "High-stakes casual",
      ],
      correct: 1,
    },
    {
      question: 'What is "back-lay arbitrage"?',
      options: [
        "Laying bets on exchange",
        "Profiting from difference between back and lay odds on exchange",
        "Matching free bets",
        "Covering draws",
      ],
      correct: 1,
    },
  ],
  Professional: [
    {
      question: 'What is "Poisson distribution" used for in betting?',
      options: ["Fish markets", "Predicting goal/score frequencies", "Calculating margins", "Tracking deposits"],
      correct: 1,
    },
    {
      question: 'What does "Pinnacle model" refer to?',
      options: [
        "Mountain betting",
        "Sharp bookmaker used as odds benchmark",
        "Accumulator system",
        "Odds comparison site",
      ],
      correct: 1,
    },
    {
      question: 'What is "ROI" in betting context?',
      options: [
        "Rules of Investment",
        "Return on Investment — profit relative to total staked",
        "Risk of Injury",
        "Rate of Increase",
      ],
      correct: 1,
    },
    {
      question: 'What is "Elo rating" used for in sports?',
      options: [
        "Electronic betting",
        "Ranking team strength based on results",
        "Odds calculation",
        "Player valuation",
      ],
      correct: 1,
    },
    {
      question: 'What does "account restriction" mean?',
      options: [
        "Deposit limit",
        "Bookmaker limiting stakes of winning bettors",
        "Age verification",
        "Country block",
      ],
      correct: 1,
    },
    {
      question: 'What is "Asian Handicap 0.25"?',
      options: [
        "Quarter ball handicap splitting stake between 0 and 0.5",
        "Draw no bet",
        "Full goal handicap",
        "Half time bet",
      ],
      correct: 0,
    },
    {
      question: 'What is "monte carlo simulation" in betting?',
      options: [
        "Casino game",
        "Statistical method using random sampling to model outcomes",
        "Odds generator",
        "Live data feed",
      ],
      correct: 1,
    },
    {
      question: 'What is a "betting exchange"?',
      options: [
        "Currency swap",
        "Platform where bettors bet against each other",
        "Odds aggregator",
        "Free bet platform",
      ],
      correct: 1,
    },
    {
      question: 'What does "liability" mean for a layer on an exchange?',
      options: ["Total winnings", "Maximum loss if selection wins", "Commission paid", "Bet size"],
      correct: 1,
    },
    {
      question: 'What is "line shopping"?',
      options: [
        "Buying merchandise",
        "Comparing odds across bookmakers for best price",
        "Checking team news",
        "Analysing form",
      ],
      correct: 1,
    },
  ],
};

export type QuizGrade = {
  label: string;
  color: string;
};

export function getGrade(percentage: number): QuizGrade {
  if (percentage >= 91) return { label: "Expert", color: "#00FF94" };
  if (percentage >= 71) return { label: "Great", color: "#00E5FF" };
  if (percentage >= 41) return { label: "Good", color: "#FFD700" };
  return { label: "Needs Work", color: "#FF6B35" };
}
