# ChatHub cloud sync

Production architecture: GitHub → Vercel → Neon Postgres + Managed Better Auth.

Authentication uses Neon's official Next.js SDK (`@neondatabase/auth`), not a custom REST proxy.

Required server secret:
- `DATABASE_URL`
- `NEON_AUTH_COOKIE_SECRET` (32+ random characters)

Optional public config:
- `NEON_AUTH_BASE_URL`; if absent, the production branch Auth URL is used.

The browser uses `@neondatabase/auth/next` and the server exposes the official catch-all auth handler at `/api/auth/[...path]`.
Cloud sync derives `owner_id` exclusively from the authenticated server session.
Auth errors remain visible in the cloud dialog until the user closes them.
