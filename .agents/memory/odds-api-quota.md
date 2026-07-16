---
name: Odds API 401 = quota, not bad key
description: The Odds API returns HTTP 401 with OUT_OF_USAGE_CREDITS when the monthly quota is exhausted
---

The Odds API (the-odds-api.com) returns **401** both for invalid keys AND when monthly usage credits run out (`error_code: OUT_OF_USAGE_CREDITS` in the body). The `/v4/sports/` list endpoint may still return 200 while odds endpoints 401.

**Why:** wasted debugging assuming the key was wrong; the key was fine, quota was exhausted.

**How to apply:** when the odds ticker/predictions log 401s across all sport keys, curl an odds endpoint and read the JSON body before touching code or asking for a new key. The app degrades gracefully (empty odds), so no code fix needed.
