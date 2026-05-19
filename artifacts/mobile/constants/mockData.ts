export const SPORT_FILTERS = [
  { key: "all", label: "All" },
  { key: "nfl", label: "NFL" },
  { key: "nba", label: "NBA" },
  { key: "mlb", label: "MLB" },
  { key: "soccer", label: "Soccer" },
  { key: "value", label: "Value" },
  { key: "avoid", label: "Avoid" },
] as const;

export const SUGGESTED_PROMPTS = [
  "What are the safest NFL picks this week?",
  "Build me a 3-leg accumulator for today",
  "Which games should I avoid today?",
  "How much should I stake on a 75% confidence pick?",
  "Explain closing line value to me",
  "What's the Kelly Criterion formula?",
];
