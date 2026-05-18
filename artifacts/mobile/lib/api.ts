export function getApiBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}`;
  }
  return "";
}

export function chatUrl(): string {
  return `${getApiBaseUrl()}/api/chat`;
}
