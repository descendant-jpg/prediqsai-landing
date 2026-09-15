import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_NOTIFICATION_PREFS,
  isInQuietHours,
  parseNotificationPrefs,
} from "../services/notification-service";

describe("notification preference handling", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses safe defaults when stored preferences are absent or malformed", () => {
    expect(parseNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs("not-json")).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it("preserves saved preference overrides while applying newly introduced defaults", () => {
    expect(parseNotificationPrefs({
      aiPickAlerts: false,
      quietHoursEnabled: true,
      quietHoursStart: "23:00",
    })).toEqual(expect.objectContaining({
      aiPickAlerts: false,
      arbitrageAlerts: true,
      quietHoursEnabled: true,
      quietHoursStart: "23:00",
      quietHoursEnd: "08:00",
    }));
  });

  it("evaluates overnight quiet hours in the user's registered local timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T21:30:00.000Z")); // 22:30 in Lagos

    expect(isInQuietHours({
      ...DEFAULT_NOTIFICATION_PREFS,
      quietHoursEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
    }, "Africa/Lagos")).toBe(true);

    vi.setSystemTime(new Date("2026-01-02T07:00:00.000Z")); // 08:00 in Lagos
    expect(isInQuietHours({
      ...DEFAULT_NOTIFICATION_PREFS,
      quietHoursEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
    }, "Africa/Lagos")).toBe(false);
  });
});