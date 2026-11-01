# GameChanger backend (Supabase)

Only three features need the server. Everything else (training log, plans, nutrition, water,
supplements, reminders, statistics, gym check-ins, offline AI recommendations and plan generator)
runs on the phone with no account.

| Feature | Server part |
| --- | --- |
| Accounts | Supabase Auth (email + password) |
| AI trainer chat | Edge Function `ai-trainer` → Claude API (key only in Supabase secrets) |
| Personal-trainer panel | Tables `coach_clients`, `coach_plans`, `workouts` with RLS + Realtime |

Without configuration the app shows "server not connected" on these screens instead of fake buttons.

## Setup

1. Create a project at https://supabase.com (region close to your users, e.g. `eu-central-1`).
2. Apply the schema: SQL editor → paste `migrations/20261101000000_init.sql` → Run
   (or `supabase link --project-ref <ref>` then `supabase db push`).
3. Auth → Providers → Email: enabled. Decide whether to require email confirmation.
4. Deploy the AI function and set its secrets:
   ```sh
   supabase functions deploy ai-trainer
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...      # never put this in the app
   supabase secrets set AI_DAILY_LIMIT=40                 # optional, messages per user per day
   ```
5. Give the app the public project URL and anon key (Project settings → API). Locally in `.env.local` (git-ignored):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   ```
   For the published app add both as GitHub repository secrets (Settings → Secrets → Actions);
   `.github/workflows/eas-update.yml` passes them to `eas update`. The anon key is public by design; the data is
   protected by row-level security.

## How the pieces fit

- **AI trainer**: the app sends the conversation plus a context built from the user's real logs
  (`src/ai/remote.ts`). The function only answers signed-in users, counts messages per day in
  `ai_usage`, and returns `{ text, plan }`. A plan comes from the `propose_plan` tool, is checked
  against the exercise catalog, and the user saves it with one tap (`src/ai/apply.ts`).
- **Personal trainer**: a user turns on coach mode (Profile → Account) and gets an invite code.
  Clients enter the code; from then on their finished workouts are mirrored to `workouts`
  (`src/backend/sync.ts`) and the coach dashboard (`/trainer`) updates live. Plans a coach assigns
  appear in the client's Plans and follow the coach's later edits.
- **Partner gyms** (`src/data/gyms.ts`) are bundled in the app for now. Moving the registry to a
  `partner_gyms` table with rotating codes verified by an Edge Function is the next step when
  real partners join.
