# Deployment Guide — Hunter System Tracker

This document covers deploying the Hunter System MVP to production with Supabase and Vercel.

---

## Required Environment Variables

Create `.env.local` for local development and configure the same variables in Vercel for production.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (Settings → API → Project URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key (Settings → API → anon public) |

Example (`.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Never commit `.env.local` or expose the Supabase service role key in the client.**

---

## Supabase Setup

### 1. Create a project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note the **Project URL** and **anon public** key from **Settings → API**.

### 2. Apply the database schema

1. Open **SQL Editor** in the Supabase dashboard.
2. Paste and run the full contents of [`schema.sql`](./schema.sql) in the project root.
3. Confirm these tables exist:
   - `profiles`
   - `quests`
   - `sleep_logs`
   - `user_achievements`
   - `daily_logs`

### 3. Verify the auth trigger

The schema includes `handle_new_user()` and `on_auth_user_created` to auto-create a `profiles` row when a user signs up. After running `schema.sql`, confirm the trigger exists under **Database → Triggers**.

### 4. Configure auth redirect URLs

In **Authentication → URL Configuration**, set:

| Setting | Local | Production |
|---------|-------|------------|
| Site URL | `http://localhost:3000` | `https://your-domain.vercel.app` |
| Redirect URLs | `http://localhost:3000/auth/callback` | `https://your-domain.vercel.app/auth/callback` |

---

## RLS Setup

Row Level Security is defined in `schema.sql`. After applying the schema, verify RLS is enabled on all public tables:

| Table | Policies |
|-------|----------|
| `profiles` | Anyone can **select**; users can **update** their own row |
| `quests` | Users can **select/insert/update/delete** their own rows |
| `sleep_logs` | Users can **select/insert/update/delete** their own rows |
| `user_achievements` | Users can **select/insert/delete** their own rows |
| `daily_logs` | Users can **select/insert/update/delete** their own rows |

**Checklist:**

- [ ] RLS enabled on all five tables
- [ ] Policies created without SQL errors
- [ ] New user signup creates a `profiles` row via trigger
- [ ] Authenticated user can read/write only their own quest and log data

---

## OAuth Setup (Google)

### 1. Google Cloud Console

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com).
2. Enable **Google+ API** / **Google Identity** as needed.
3. Create **OAuth 2.0 Client ID** (Web application).
4. Add authorized redirect URI from Supabase (see step 2 below).

### 2. Supabase provider configuration

1. In Supabase: **Authentication → Providers → Google**.
2. Enable Google provider.
3. Paste Google **Client ID** and **Client Secret**.
4. Copy the Supabase callback URL shown there into Google’s authorized redirect URIs.

### 3. Email/password auth

Email/password is enabled by default. For production, configure **Authentication → Email** templates and confirm email verification settings match your flow (`/auth/callback` handles the redirect).

---

## Vercel Deployment Steps

### 1. Push code to GitHub

Ensure the repository is pushed to GitHub (or GitLab/Bitbucket connected to Vercel).

### 2. Import project in Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**.
2. Import the repository.
3. Framework preset: **Next.js** (auto-detected).

### 3. Configure environment variables

In Vercel project **Settings → Environment Variables**, add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Apply to **Production**, **Preview**, and **Development** as needed.

### 4. Deploy

1. Click **Deploy**.
2. After deploy, copy the production URL.
3. Update Supabase **Site URL** and **Redirect URLs** with the Vercel domain.

### 5. Redeploy (if env vars were added after first deploy)

Trigger a new deployment so build-time and runtime env vars are available.

---

## Post-Deployment Verification Checklist

### Auth

- [ ] Visit `/` — redirects to `/auth/login` when logged out
- [ ] Register with email/password — verification email received (if confirmation enabled)
- [ ] Sign in — redirects to `/dashboard`
- [ ] Google OAuth — completes and lands on `/dashboard`
- [ ] Sign out — returns to login flow
- [ ] Session persists after page refresh (middleware + cookies)

### Gameplay

- [ ] Default quests seed on first dashboard visit
- [ ] Completing a quest updates XP, level, and rank in `profiles`
- [ ] Sleep log awards XP once per day
- [ ] Daily training toggles persist
- [ ] Perfect-day overlay appears when both activities completed same day
- [ ] Level-up overlay appears on level increase
- [ ] Achievements unlock and toast appears
- [ ] Reset all data clears progress

### Profile & stats

- [ ] `/profile` shows rank, level, XP, streaks, join date
- [ ] Hunter name save persists
- [ ] `/stats` charts load with data
- [ ] `profiles.daily_streak` and `profiles.last_active_at` update on activity

### PWA

- [ ] `/manifest.json` loads (200)
- [ ] `/icon-192x192.png` and `/icon-512x512.png` load (200)
- [ ] Install prompt appears on supported browsers
- [ ] Reminders button requests notification permission
- [ ] Service worker registers without console errors

### Build health

```bash
npm run build
npx tsc --noEmit
```

Both should exit with code 0.

---

## Troubleshooting

| Issue | Likely cause | Fix |
|-------|--------------|-----|
| Auth callback fails | Redirect URL mismatch | Add exact callback URL in Supabase and Google OAuth |
| `profiles` row missing | Trigger not applied | Re-run trigger section of `schema.sql` |
| RLS permission denied | Policies missing | Re-run RLS section of `schema.sql` |
| Blank dashboard / no data | Wrong env vars | Verify Vercel env vars match Supabase project |
| OAuth works locally but not prod | Production URL not in Supabase redirects | Add Vercel URL to redirect allow list |
| PWA icons 404 | Icons not in `public/` | Ensure `icon-192x192.png` and `icon-512x512.png` exist |

---

## Architecture Notes

- **Session refresh:** `middleware.ts` calls `lib/supabase/middleware.ts` on each matched request to refresh auth cookies via `supabase.auth.getUser()`.
- **Profile sync:** `lib/profile.ts` keeps `xp`, `level`, `rank`, and `last_active_at` aligned; `daily_streak` syncs when daily logs change.
- **Client auth guards:** Protected pages use client-side redirects; middleware handles cookies only (no route blocking redesign).
