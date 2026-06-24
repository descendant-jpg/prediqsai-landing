import Constants from "expo-constants";
import { Platform } from "react-native";

/** Google OAuth Web client ID (client_type 3 in google-services.json). */
const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  "674932625778-s0s7otnbqu2e4gptpm1nore79850sb59.apps.googleusercontent.com";

/** Error thrown when native Google Sign-In is not available (Expo Go / web). */
export const GOOGLE_UNAVAILABLE = "GOOGLE_UNAVAILABLE";
/** Error thrown when the user cancels the Google flow. */
export const GOOGLE_CANCELLED = "GOOGLE_CANCELLED";

/**
 * Google Sign-In is a native module: it cannot run inside Expo Go or on web.
 * A production / dev build is required.
 */
export function isGoogleSignInAvailable(): boolean {
  if (Platform.OS === "web") return false;
  if (Constants.appOwnership === "expo") return false;
  return true;
}

let configured = false;

/* eslint-disable @typescript-eslint/no-require-imports */
function loadModule(): typeof import("@react-native-google-signin/google-signin") | null {
  try {
    return require("@react-native-google-signin/google-signin");
  } catch {
    return null;
  }
}

function ensureConfigured(mod: NonNullable<ReturnType<typeof loadModule>>): void {
  if (configured) return;
  mod.GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, offlineAccess: false });
  configured = true;
}

/**
 * Run the native Google Sign-In flow and return the Google ID token to hand off
 * to our backend. Throws GOOGLE_UNAVAILABLE in Expo Go/web, GOOGLE_CANCELLED if
 * the user dismisses the sheet.
 */
export async function signInWithGoogle(): Promise<string> {
  if (!isGoogleSignInAvailable()) throw new Error(GOOGLE_UNAVAILABLE);

  const mod = loadModule();
  if (!mod) throw new Error(GOOGLE_UNAVAILABLE);

  ensureConfigured(mod);

  try {
    await mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = (await mod.GoogleSignin.signIn()) as unknown as {
      type?: string;
      idToken?: string | null;
      data?: { idToken?: string | null };
    };

    if (result?.type === "cancelled") throw new Error(GOOGLE_CANCELLED);

    let idToken = result?.data?.idToken ?? result?.idToken ?? null;
    if (!idToken) {
      const tokens = await mod.GoogleSignin.getTokens();
      idToken = tokens?.idToken ?? null;
    }
    if (!idToken) throw new Error("No Google ID token returned");
    return idToken;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code && mod.statusCodes && code === mod.statusCodes.SIGN_IN_CANCELLED) {
      throw new Error(GOOGLE_CANCELLED);
    }
    throw err;
  }
}

/** Best-effort sign-out from the native Google session (no-op when unavailable). */
export async function signOutGoogle(): Promise<void> {
  if (!isGoogleSignInAvailable()) return;
  const mod = loadModule();
  if (!mod) return;
  try {
    ensureConfigured(mod);
    await mod.GoogleSignin.signOut();
  } catch {
    /* ignore */
  }
}
