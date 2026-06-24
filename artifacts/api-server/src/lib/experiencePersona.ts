import type { Request } from "express";

/**
 * User's self-reported betting experience level, sent by the mobile client as the
 * `X-User-Experience` header on every request. Used to dynamically tailor the AI
 * system prompt's tone and depth.
 */
export type ExperienceLevel = "Beginner" | "Intermediate" | "Advanced" | "Professional";

const PERSONAS: Record<ExperienceLevel, string> = {
  Beginner:
    "The user is a beginner. Explain odds and betting concepts very simply. Avoid heavy jargon. Focus on plain-English explanations of WHY a bet makes sense and strictly emphasize bankroll safety.",
  Intermediate:
    "The user has intermediate experience. Use standard betting terminology. Provide a balanced mix of basic stats and clear reasoning.",
  Advanced:
    "The user is advanced. Include deep statistical breakdowns, Expected Value (EV) analysis, implied probability comparisons, and line movement discussions.",
  Professional:
    "The user is a professional bettor. Do not explain basic concepts. Provide raw, highly technical, quantitative analysis, sharp money indicators, and strictly data-driven edge calculations.",
};

const VALID = new Set<ExperienceLevel>([
  "Beginner",
  "Intermediate",
  "Advanced",
  "Professional",
]);

/** Default applied when the header is missing or unrecognized. */
export const DEFAULT_EXPERIENCE: ExperienceLevel = "Intermediate";

/** Extract and validate the `X-User-Experience` header, defaulting to Intermediate. */
export function getExperienceLevel(req: Request): ExperienceLevel {
  const raw = req.headers["x-user-experience"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && VALID.has(value as ExperienceLevel)
    ? (value as ExperienceLevel)
    : DEFAULT_EXPERIENCE;
}

/** The persona instruction string for a given experience level. */
export function experiencePersona(level: ExperienceLevel): string {
  return PERSONAS[level];
}

/**
 * Append the experience-specific persona to a base system prompt, derived from the
 * request's `X-User-Experience` header.
 */
export function withExperiencePersona(basePrompt: string, req: Request): string {
  return `${basePrompt}\n\nUSER EXPERIENCE LEVEL: ${experiencePersona(getExperienceLevel(req))}`;
}
