export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  author: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as {
        error?: string;
        details?: Array<{ message?: string; path?: Array<string | number> }>;
      };
      const detail = parsed.details?.[0];
      if (detail?.message) {
        const field = detail.path?.join(".");
        return field ? `${field}: ${detail.message}` : detail.message;
      }
      return parsed.error || fallback;
    } catch {
      return error.message || fallback;
    }
  }
  return fallback;
}