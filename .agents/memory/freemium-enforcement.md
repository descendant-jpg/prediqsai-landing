---
name: Freemium paywall is server-enforced
description: Free/premium gating on predictions must happen in the API (redaction + locked flag); UI blur is cosmetic only.
---

The free-tier paywall on PrediQs AI predictions is enforced by the API, not the app UI. `GET /api/predictions` returns the full fixture list to free users but with insight fields (pick, confidence, reasoning, probabilities) redacted and `locked: true`; `/api/predictions/match-of-day` blanks pick/confidence for non-premium. The mobile blur overlays (BlurView in PredictionFeedCard/MatchOfTheDay) are presentation only.

**Why:** A code review caught match-of-day leaking real pick/confidence to free users behind a cosmetic blur. Anything gated only in the UI is readable from the raw API response.

**How to apply:** When adding any premium-gated field or endpoint, redact it server-side for free users and set the `locked` flag; never rely on hiding/blurring in the client as the paywall boundary.
