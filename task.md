# Hunter System MVP Task Log

## Phase 3 - Sleep Tracking + Statistics

- Added daily sleep logging backed by `sleep_logs`.
- Enforced one sleep entry per day through the existing Supabase unique constraint.
- Added whole-hour selector for 4-9 hours.
- Applied sleep XP bonuses: 4h = 0 XP, 5-6h = 50 XP, 7-9h = 100 XP.
- Added Recharts XP and sleep charts.
- Added current streak, longest streak, total quests completed, and monthly summary stats.
- Updated monthly calculations to use the real number of days in the current month.

## Phase 4 - Achievements

- Added achievement definitions for First Quest, 7 Day Streak, 30 Day Streak, Level Milestones, Rank Promotions, and Sleep Consistency.
- Added Supabase persistence via `user_achievements`.
- Added unlock evaluation from persisted quests, daily logs, sleep logs, and XP state.
- Added achievement unlock toast and achievement animation.
- Added achievement history on the profile page.

## Phase 5 - Profile Page

- Added profile route.
- Displays Hunter Name, Rank, Level, Total XP, Current Streak, Longest Streak, Achievement Count, and Join Date.
- Added Hunter Name editing through the `profiles.username` field.

## Phase 6 - PWA + Reminders

- Verified manifest and icons are wired through Next metadata.
- Added service worker registration.
- Added install prompt UI.
- Added local browser notification reminder scheduling.
- Added notification click handling back to the dashboard.

## Phase 7 - Polish

- Added level-up, perfect-day, and achievement animations.
- Preserved existing loading and empty states.
- Improved mobile layout behavior for sleep selector, profile stats, and notification controls.
- Cleaned corrupted UI punctuation in touched components.
