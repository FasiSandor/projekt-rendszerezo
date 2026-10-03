# ChatHub cloud schema

The production database is Neon Postgres. Vercel provides `DATABASE_URL`.

Tables are created idempotently by `ensureChatHubSchema()`:
- `chathub_projects`
- `chathub_chats`
- `chathub_topics`
- `chathub_import_logs`
- `chathub_sync_state`

All user-owned tables are keyed by `owner_id`. Do not expose CRUD endpoints until Neon Auth is wired and an authenticated user id can be resolved server-side.

The current cloud status endpoint is read-only and contains no user data:
`GET /api/cloud/status`.

LocalStorage remains the source of truth until authenticated cloud sync is enabled. This guarantees the existing catalog is not lost during migration.
