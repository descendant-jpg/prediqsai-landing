import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { api } from "@/lib/api";

type PermStatus = { granted: boolean; canAskAgain: boolean };

// Lazily import expo-notifications only on native to avoid web crashes
let Notifications: typeof import("expo-notifications") | null = null;
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require("expo-notifications");
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert:  true,
      shouldPlaySound:  true,
      shouldSetBadge:   true,
      shouldShowBanner: true,
      shouldShowList:   true,
    }),
  });
}

export type PushRegistrationResult =
  | { status: "granted";     token: string }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "error"; message: string };

export async function registerForPushNotificationsAsync(
  authToken: string,
): Promise<PushRegistrationResult> {
  if (Platform.OS === "web" || !Notifications) return { status: "unavailable" };

  const existing = (await Notifications.getPermissionsAsync()) as unknown as PermStatus;
  let granted = existing.granted;

  if (!granted && existing.canAskAgain) {
    const result = (await Notifications.requestPermissionsAsync()) as unknown as PermStatus;
    granted = result.granted;
  }

  if (!granted) return { status: "denied" };

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("prediq-alerts", {
      name:             "PrediQs Alerts",
      importance:       Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       "#FFD700",
      sound:            "default",
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "14d66951-a9a8-4e25-b5b8-7c80e517285d",
    });
    const token = tokenData.data;
    await api.notifications.registerToken(authToken, token);
    return { status: "granted", token };
  } catch (err) {
    return {
      status:  "error",
      message: err instanceof Error ? err.message : "Token error",
    };
  }
}

export function usePushNotifications(authToken: string | null) {
  const [pushToken, setPushToken]     = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifListener = useRef<{ remove(): void } | null>(null);
  const responseListener = useRef<{ remove(): void } | null>(null);

  useEffect(() => {
    if (!authToken) return;

    // Register push token (native only)
    if (Platform.OS !== "web") {
      registerForPushNotificationsAsync(authToken).then((result) => {
        if (result.status === "granted") setPushToken(result.token);
      });
    }

    // Fetch unread count
    api.notifications.getUnreadCount(authToken).then((res) => {
      setUnreadCount(res.count ?? 0);
    }).catch(() => {});

    // Native-only listeners
    if (Platform.OS !== "web" && Notifications) {
      notifListener.current = Notifications.addNotificationReceivedListener(() => {
        setUnreadCount((n) => n + 1);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
        setUnreadCount(0);
        api.notifications.markRead(authToken).catch(() => {});
      });
    }

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [authToken]);

  async function clearBadge() {
    setUnreadCount(0);
    if (Platform.OS !== "web" && Notifications) {
      await Notifications.setBadgeCountAsync(0);
    }
    if (authToken) await api.notifications.markRead(authToken).catch(() => {});
  }

  return { pushToken, unreadCount, clearBadge };
}
