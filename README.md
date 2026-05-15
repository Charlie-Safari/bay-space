# Bay Space

Bay Space is a Next.js app backed by Supabase Postgres through server-only API
routes. The browser never receives the elevated Supabase key.

## Getting Started

Create a Supabase project, then run the SQL in
`supabase/migrations/202605140001_bay_space_core.sql` from the Supabase SQL
Editor. That migration creates the member, credential, session, post, saved
post, and report tables used by the app.

Copy the env template:

```bash
cp .env.example .env.local
```

Set these values in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your_server_only_key
```

For older Supabase projects, `SUPABASE_SERVICE_ROLE_KEY` can be used instead of
`SUPABASE_SECRET_KEY`.

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the
result.

## Supabase Setup Notes

- Find the project URL in Supabase Dashboard > Project Settings > Data API.
- Find server keys in Supabase Dashboard > Project Settings > API Keys.
- Keep `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` out of client code,
  commits, screenshots, and chat.
- After changing `.env.local`, restart `npm run dev` so Next.js reloads the
  environment.

The app uses Supabase REST at `/rest/v1` with an elevated server key from route
handlers. Row Level Security is enabled, and direct anon/authenticated table
access is revoked by default in the migration.

## Bootstrap Admin

The migration seeds member `33333` as `bay-oracle` with the bootstrap credential
hash from the previous local backend. Rotate that PIN with a manual SQL update
after the first successful deployment.

## Verification

After the env file and migration are in place, this route should return the next
available member number:

```bash
curl http://localhost:3000/api/members?next=true
```

Expected shape:

```json
{"member":"33334"}
```
