---
name: App Store notification entitlements
description: Rules for reconciling iOS subscription changes after purchase verification.
---

# App Store notification entitlements

**Rule:** Use Apple’s official App Store Server Library to verify both the notification and embedded transaction. Reconcile an entitlement event against the current transaction ID as well as the original transaction ID.

**Why:** App Store notifications may concern an earlier renewal period and can arrive out of order. A chain-wide refund or expiry downgrade can incorrectly remove a newer valid renewal.

**How to apply:** Remove access only when the signed event’s original transaction ID and transaction ID match the entitlement currently stored for the account. A later valid store verification always replaces the current transaction.