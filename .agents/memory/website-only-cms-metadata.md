---
name: Website-only CMS metadata
description: How the standalone website persists richer article metadata without changing the shared backend schema.
---

Article category, featured image, Open Graph image, custom meta title, and meta description are serialized in a delimited front-matter block at the beginning of the existing Markdown `content` field. The website parses that block before rendering the article and generating metadata.

**Why:** The website repository must remain independently deployable while the shared Express API intentionally accepts only the core blog post fields. This keeps richer editorial metadata persistent through the current API without making a backend/schema change in the landing repository.

**How to apply:** Preserve the front-matter format when evolving the website editor or blog rendering. If the backend later gains structured metadata columns, migrate existing front matter deliberately before removing this compatibility layer.

For native image uploads, the standalone website uses a Next.js server route that first validates the existing Express admin JWT and then writes to Supabase Storage with a Vercel-held service role credential.

**Why:** The Express JWT is not a Supabase Auth token, so direct browser uploads would require an unsafe anonymous Storage policy. Server-side verification keeps upload authorization aligned with the CMS.

**How to apply:** Keep the service role key server-only. The public bucket is read-only from the browser; all upload and media listing requests must keep the Express admin verification step.