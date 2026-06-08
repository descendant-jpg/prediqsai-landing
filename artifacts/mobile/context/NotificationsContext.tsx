import React, { createContext, useContext, useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export type NotificationPrefs = {
  aiPickAlerts:      boolean;
  arbitrageAlerts:   boolean;
  liveArbAlerts:     boolean;
  matchReminders:    boolean;
  evAlerts:          boolean;
  quietHoursEnabled: boolean;
  quietHoursStart:   string;
  quietHoursEnd:     string;
};

const DEFAULT_PREFS: NotificationPrefs = {
  aiPickAlerts:      true,
  arbitrageAlerts:   true,
  liveArbAlerts:     true,
  matchReminders:    true,
  evAlerts:          false,
  quietHoursEnabled: false,
  quietHoursStart:   "22:00",
  quietHoursEnd:     "08:00",
};

type NotificationsContextValue = {
  prefs:       NotificationPrefs;
  unreadCount: number;
  loading:     boolean;
  updatePref:  (key: keyof NotificationPrefs, value: boolean | string) => Promise<void>;
  clearBadge:  () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue>({
  prefs:       DEFAULT_PREFS,
  unreadCount: 0,
  loading:     false,
  updatePref:  async () => {},
  clearBadge:  async () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { unreadCount, clearBadge } = usePushNotifications(token ?? null);
  const [prefs, setPrefs]   = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.notifications.getPrefs(token)
      .then((p) => setPrefs({ ...DEFAULT_PREFS, ...p }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  async function updatePref(key: keyof NotificationPrefs, value: boolean | string) {
    if (!token) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      await api.notifications.updatePrefs(token, { [key]: value });
    } catch {
      setPrefs(prefs); // rollback on error
    }
  }

  return (
    <NotificationsContext.Provider value={{ prefs, unreadCount, loading, updatePref, clearBadge }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
