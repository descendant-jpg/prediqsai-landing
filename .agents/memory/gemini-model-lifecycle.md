---
name: Gemini model lifecycle and free-tier behavior
description: Gemini flash models get retired (404) for newer keys; free tier 429s under repeated calls and 503s under demand spikes — always use a fallback model chain.
---

# Gemini model lifecycle (direct API key, generativelanguage.googleapis.com)

- Named flash models are retired aggressively: `gemini-1.5-flash` returns **404 "not found for API version v1beta"** for keys created after retirement. The 404 error body names the current replacement (it pointed to `gemini-3.6-flash`).
- Free-tier keys **429 "exceeded your current quota"** after only a handful of calls — a few smoke-test loops exhaust it for a while. Don't debug-loop against the live API; probe once with curl, then wait.
- Current models also **503 "high demand"** in bursts lasting minutes; retries with backoff alone are not enough.

**Why:** A daily cron feature silently produced zero output for a whole debugging session because the planned model (1.5-flash) was retired and every fallback assumption had to be discovered live.

**How to apply:** For any Gemini call in this project, walk a fallback chain (preferred flash → older flash → `gemini-flash-latest` → `gemma-4-31b-it`, which keeps serving when the flash pool is saturated). Treat 404/429/malformed-output as immediate fall-through to the next model; retry only 503/timeout with backoff. See `artifacts/api-server/src/services/topic-generator.ts` for the working pattern.
