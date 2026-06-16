import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateLevelInfo, getRankFromLevel } from '@/lib/gameplay';

export interface DailyLogRow {
  date: string;
  webdev_completed: boolean;
  jog_completed: boolean;
}

export function buildProfileStatsFromXp(xp: number) {
  const safeXp = Math.max(0, xp);
  const levelInfo = calculateLevelInfo(safeXp);

  return {
    xp: safeXp,
    level: levelInfo.level,
    rank: getRankFromLevel(levelInfo.level),
    last_active_at: new Date().toISOString(),
  };
}

export function computeCurrentPerfectStreak(dailyLogs: DailyLogRow[]): number {
  const perfectDates = new Set(
    dailyLogs.filter((row) => row.webdev_completed && row.jog_completed).map((row) => row.date)
  );

  let currentRun = 0;
  const today = new Date();

  for (let offset = 0; offset < 366; offset++) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    if (perfectDates.has(key)) {
      currentRun++;
    } else if (offset > 0) {
      break;
    }
  }

  return currentRun;
}

export async function syncProfileXp(supabase: SupabaseClient, userId: string, xp: number) {
  const stats = buildProfileStatsFromXp(xp);
  const { error } = await supabase.from('profiles').update(stats).eq('id', userId);
  if (error) throw error;
  return stats;
}

export async function syncProfileDailyStreak(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('date, webdev_completed, jog_completed')
    .eq('user_id', userId);

  if (error) throw error;

  const dailyStreak = computeCurrentPerfectStreak((data ?? []) as DailyLogRow[]);
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      daily_streak: dailyStreak,
      last_active_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) throw updateError;
  return dailyStreak;
}

export async function touchProfileActivity(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
}
