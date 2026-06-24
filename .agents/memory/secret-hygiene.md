---
name: secret hygiene (firebase.json / service-account keys)
description: What firebase.json was in this repo, why it must never be committed, and the mobile credential split
---

`artifacts/mobile/firebase.json` here is a **Google Cloud service-account key** (`type: service_account`, real `private_key`), NOT a Firebase CLI config. It is a **backend credential** and must never be committed or shipped in a mobile bundle (anyone can unzip an APK).

**Rule:** gitignore `firebase.json`. The Android build only needs `google-services.json` (client config — its API key is client-side and safe to commit). Keep these two straight: client config = commit OK; service-account key = never.

**Why:** it got swept into an auto-checkpoint commit, was not gitignored, and GitHub push protection (GH013) blocked the push.

**How to apply:** if a service-account key is ever committed, treat it as compromised — the user must rotate/revoke it in Google Cloud Console → IAM & Admin → Service Accounts → Keys (agent cannot do this). Then purge it from history (see git-push-workflow.md) — do NOT use GitHub's "allow secret" bypass link for a live credential.
