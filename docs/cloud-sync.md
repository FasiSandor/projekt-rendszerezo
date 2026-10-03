# ChatHub cloud sync

Architecture: GitHub → Vercel → Neon Postgres + Neon Auth.

- `DATABASE_URL` is server-only.
- Neon Auth is proxied through same-origin Next.js API routes.
- Cloud CRUD is available only after a valid Neon Auth session.
- `owner_id` is always derived server-side from the authenticated session, never accepted from the client.
- Before first cloud reconciliation the browser stores `chathub-precloud-backup-v1`.
- LocalStorage remains an offline/local safety copy.
- After login, an empty cloud is seeded from local data; a non-empty cloud becomes the authoritative snapshot for that user.
- Changes are debounced and saved after 2.2 seconds; manual upload/download buttons are available in the cloud dialog.

Public Neon Auth endpoint fallback:
`https://ep-lively-night-b258ug4c.neonauth.eu-central-1.aws.neon.tech/neondb/auth`

Preferred production setup: define `NEON_AUTH_BASE_URL` in Vercel with the production branch Auth URL. The fallback is public configuration, not a credential.

The Neon Console must trust the production origin `https://projekt-rendszerezo.vercel.app`.
