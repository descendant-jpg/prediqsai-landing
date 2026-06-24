import { Router } from "express";
import { z } from "zod/v4";

import { anthropic } from "@workspace/integrations-anthropic-ai";
import { withExperiencePersona } from "../lib/experiencePersona";

const router = Router();

const SYSTEM_PROMPT = `You are PrediQs AI, a world-class sports betting intelligence assistant. You analyze NFL, NBA, MLB, and soccer matches, provide data-driven predictions with clear reasoning, explain betting concepts, build smart accumulators, help with bankroll management, and proactively warn users when NOT to bet. Be direct, honest, and data-focused. Keep responses concise and well-structured for mobile reading. Use short paragraphs and bullet points where helpful. Never encourage gambling addiction. Always recommend responsible gambling. If someone shows signs of problem gambling, provide the helpline: 1-800-522-4700.`;

const MessageSchema = z.array(
  z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(4000),
  }),
).min(1).max(50);

router.post("/chat", async (req, res) => {
  const parsed = MessageSchema.safeParse(req.body?.messages);
  if (!parsed.success) {
    res.status(400).json({ error: "messages array is required and must be valid" });
    return;
  }

  const language: string | undefined = req.body?.language;

  const baseWithLanguage = language && language !== "Respond in English."
    ? `${SYSTEM_PROMPT}\n\nIMPORTANT: ${language}`
    : SYSTEM_PROMPT;

  // Tailor tone/depth to the user's betting experience (X-User-Experience header).
  const systemPrompt = withExperiencePersona(baseWithLanguage, req);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: parsed.data.map((m) => ({ role: m.role, content: m.content })),
    });

    const reply = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    res.json({ reply });
  } catch (err) {
    req.log.error({ err }, "Chat error");
    res.status(500).json({ error: "AI service temporarily unavailable. Please try again." });
  }
});

export default router;
