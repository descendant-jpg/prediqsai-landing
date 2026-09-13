"use client";

export const APP_STORE_URL = "https://apps.apple.com/ng/app/prediqs-ai-ai-sports-picks/id6792316441";
export const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.prediqsai.app&pcampaignid=web_share";

export function getStoreUrl(userAgent = "") {
  return /iPad|iPhone|iPod/i.test(userAgent) ? APP_STORE_URL : GOOGLE_PLAY_URL;
}

export function openAppOrStore() {
  if (typeof window === "undefined") return;

  const isMobile = /Android|iPad|iPhone|iPod/i.test(window.navigator.userAgent);
  if (!isMobile) {
    window.open(getStoreUrl(window.navigator.userAgent), "_blank", "noopener,noreferrer");
    return;
  }

  let appOpened = false;
  const markAppOpened = () => {
    if (document.visibilityState === "hidden") appOpened = true;
  };

  document.addEventListener("visibilitychange", markAppOpened);
  window.location.href = "prediqsai://";
  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", markAppOpened);
    if (!appOpened && document.visibilityState === "visible") {
      window.location.href = getStoreUrl(window.navigator.userAgent);
    }
  }, 1500);
}