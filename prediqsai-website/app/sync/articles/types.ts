export type BlogPost = {
  id: number; title: string; slug: string; excerpt: string | null; content: string;
  author: string | null; publishedAt: string | null; createdAt: string; updatedAt: string;
};

export function apiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    try { return (JSON.parse(error.message) as { error?: string }).error || fallback; }
    catch { return error.message || fallback; }
  }
  return fallback;
}