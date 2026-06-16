# Hunter System MVP Walkthrough

## Dashboard

1. Sign in and open `/dashboard`.
2. Complete daily or weekly quests to earn XP.
3. Log today's sleep once using the 4-9 hour selector.
4. Toggle Web Dev and Daily Jog in the monthly training log to build perfect-day streaks.
5. Level-up and achievement unlock notifications appear automatically when milestones are reached.

## Statistics

1. Open `/stats` from the dashboard.
2. Review total quests completed, current streak, longest streak, and average sleep.
3. Review the monthly progress summary for XP earned, perfect training days, sleep logs, and quests done.
4. Use the XP chart and sleep chart to inspect monthly trends.

## Achievements

Achievements unlock from persisted Supabase data:

- First Quest unlocks after the first completed quest.
- 7 Day Streak and 30 Day Streak unlock from perfect training streaks.
- Level Milestones unlock at configured level thresholds.
- Rank Promotions unlock when level progression reaches a new rank.
- Sleep Consistency unlocks after 7 full-recovery sleep logs.

## Profile

1. Open `/profile` from the dashboard.
2. Review Hunter Name, Rank, Level, Total XP, streaks, achievement count, and join date.
3. Edit Hunter Name and save.
4. Review achievement history.

## PWA + Reminders

1. Use the install button when the browser exposes the PWA install prompt.
2. Enable reminders to allow local browser notifications.
3. The app schedules a local 8:00 PM reminder while the app is open.
4. Notification clicks return to `/dashboard`.
