import type { SupabaseClient } from '@supabase/supabase-js';
import { getRankFromLevel } from '@/lib/gameplay';

export interface AchievementDefinition {
  code: string;
  title: string;
  description: string;
}

export interface AchievementRecord {
  id: string;
  code: string;
  title: string;
  description: string;
  unlocked_at: string;
}

export interface AchievementStats {
  completedQuests: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  rank: string;
  sleepConsistencyDays: number;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { code: 'first_quest', title: 'First Quest', description: 'Complete your first quest.' },
  { code: 'streak_7', title: '7 Day Streak', description: 'Complete perfect daily training for 7 days.' },
  { code: 'streak_30', title: '30 Day Streak', description: 'Complete perfect daily training for 30 days.' },
  { code: 'level_5', title: 'Level Milestone I', description: 'Reach Hunter Level 5.' },
  { code: 'level_10', title: 'Level Milestone II', description: 'Reach Hunter Level 10.' },
  { code: 'level_25', title: 'Level Milestone III', description: 'Reach Hunter Level 25.' },
  { code: 'rank_d', title: 'Rank Promotion: D', description: 'Earn promotion to D-Rank.' },
  { code: 'rank_c', title: 'Rank Promotion: C', description: 'Earn promotion to C-Rank.' },
  { code: 'rank_b', title: 'Rank Promotion: B', description: 'Earn promotion to B-Rank.' },
  { code: 'rank_a', title: 'Rank Promotion: A', description: 'Earn promotion to A-Rank.' },
  { code: 'rank_s', title: 'Rank Promotion: S', description: 'Earn promotion to S-Rank.' },
  { code: 'sleep_consistency', title: 'Sleep Consistency', description: 'Log 7 days of full recovery sleep.' },
];

const rankOrder = ['E', 'D', 'C', 'B', 'A', 'S', 'National Hunter', 'Monarch Candidate', 'Shadow Monarch'];

export function evaluateAchievements(stats: AchievementStats): AchievementDefinition[] {
  const rank = stats.rank || getRankFromLevel(stats.level);
  const rankIndex = rankOrder.indexOf(rank);

  return ACHIEVEMENTS.filter((achievement) => {
    switch (achievement.code) {
      case 'first_quest':
        return stats.completedQuests >= 1;
      case 'streak_7':
        return stats.longestStreak >= 7 || stats.currentStreak >= 7;
      case 'streak_30':
        return stats.longestStreak >= 30 || stats.currentStreak >= 30;
      case 'level_5':
        return stats.level >= 5;
      case 'level_10':
        return stats.level >= 10;
      case 'level_25':
        return stats.level >= 25;
      case 'rank_d':
        return rankIndex >= rankOrder.indexOf('D');
      case 'rank_c':
        return rankIndex >= rankOrder.indexOf('C');
      case 'rank_b':
        return rankIndex >= rankOrder.indexOf('B');
      case 'rank_a':
        return rankIndex >= rankOrder.indexOf('A');
      case 'rank_s':
        return rankIndex >= rankOrder.indexOf('S');
      case 'sleep_consistency':
        return stats.sleepConsistencyDays >= 7;
      default:
        return false;
    }
  });
}

export async function unlockMissingAchievements(
  supabase: SupabaseClient,
  userId: string,
  stats: AchievementStats
) {
  const eligible = evaluateAchievements(stats);
  if (eligible.length === 0) return [];

  const { data: unlocked, error: fetchError } = await supabase
    .from('user_achievements')
    .select('code')
    .eq('user_id', userId);

  if (fetchError) {
  console.error('FETCH ACHIEVEMENTS ERROR', fetchError);
  throw fetchError;
}

  const unlockedCodes = new Set((unlocked ?? []).map((row: { code: string }) => row.code));
  const missing = eligible.filter((achievement) => !unlockedCodes.has(achievement.code));
  if (missing.length === 0) return [];

  const { data, error } = await supabase
    .from('user_achievements')
    .insert(
      missing.map((achievement) => ({
        user_id: userId,
        code: achievement.code,
        title: achievement.title,
        description: achievement.description,
      }))
    )
    .select('id, code, title, description, unlocked_at');

  if (error) {
  console.error('INSERT ACHIEVEMENTS ERROR', error);
  throw error;
}
  return (data ?? []) as AchievementRecord[];
}
