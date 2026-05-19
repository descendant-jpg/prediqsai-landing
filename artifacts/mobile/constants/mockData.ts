export const SPORT_FILTERS = [
  { key: "all", label: "All" },
  { key: "nfl", label: "NFL" },
  { key: "nba", label: "NBA" },
  { key: "mlb", label: "MLB" },
  { key: "soccer", label: "Soccer" },
  { key: "value", label: "Edge" },
  { key: "avoid", label: "Avoid" },
] as const;

export const SUGGESTED_PROMPTS = [
  "Which matches have the strongest statistical case this week?",
  "Build me a 3-match analysis scenario for today",
  "Which matches are high risk to avoid today?",
  "How much should I allocate on a 75% probability analysis?",
  "Explain closing line value to me",
  "What's the statistical stake calculation formula?",
];
