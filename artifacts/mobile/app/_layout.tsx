import { setBaseUrl } from "@workspace/api-client-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import { IAPProvider } from "@/context/IAPContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { RegionProvider } from "@/context/RegionContext";

if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

// Only lock the splash on native; web hides it immediately to avoid the white overlay
if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

// Suppress known false-positive warnings from third-party libraries (GestureHandler,
// KeyboardProvider, expo-router internals) that trigger the Expo dev overlay on web.
// These are react-native-web dev-mode checks that fire for empty-string children
// and deprecated prop styles inside vendor components we cannot modify.
if (Platform.OS === "web") {
  LogBox.ignoreLogs([
    "Unexpected text node",
    "props.pointerEvents is deprecated",
  ]);

  const _origError = console.error.bind(console);
  (console as any).error = (...args: unknown[]) => {
    const msg = typeof args[0] === "string" ? args[0] : "";
    if (
      msg.includes("Unexpected text node") ||
      msg.includes("props.pointerEvents is deprecated")
    ) {
      return;
    }
    _origError(...args);
  };
}

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, isLoading, pendingOnboarding, setPendingOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    if (!user) {
      if (!inAuthGroup) router.replace("/(auth)/login");
      return;
    }

    if (inAuthGroup || inOnboarding) {
      if (pendingOnboarding) {
        setPendingOnboarding(false);
        router.replace("/onboarding");
      } else {
        router.replace("/(tabs)");
      }
    }
  }, [user, isLoading, segments, pendingOnboarding]);

  return (
    <Stack screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="slip-analysis" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="setup" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="settings" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="arbitrage"    options={{ headerShown: false }} />
      <Stack.Screen name="worldcup"     options={{ headerShown: false }} />
      <Stack.Screen name="admin"        options={{ headerShown: false }} />
      <Stack.Screen name="about"        options={{ headerShown: false }} />
      <Stack.Screen name="leaderboard"           options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="risk-profile"          options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="privacy-policy"        options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="terms-of-service"      options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="responsible-gambling"  options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="match-detail"           options={{ headerShown: false }} />
      <Stack.Screen name="learning"               options={{ headerShown: false }} />
      <Stack.Screen name="oracle-chat"      options={{ headerShown: false }} />
      <Stack.Screen name="change-password"           options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="subscription"             options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="notification-settings"    options={{ headerShown: false, presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    // Set dark body background immediately on web to prevent white flash
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.documentElement.style.backgroundColor = "#070B12";
      document.body.style.backgroundColor = "#070B12";
    }
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#070B12" }}>
            <KeyboardProvider>
              <LanguageProvider>
                <RegionProvider>
                  <AuthProvider>
                    <AppProvider>
                      <IAPProvider>
                        <NotificationsProvider>
                          <RootLayoutNav />
                        </NotificationsProvider>
                      </IAPProvider>
                    </AppProvider>
                  </AuthProvider>
                </RegionProvider>
              </LanguageProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
