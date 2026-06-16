// gameplay.ts - Core Level and XP system logic

export interface LevelInfo {
  level: number;
  currentXp: number;
  xpNeededForNext: number;
  percent: number;
}

/**
 * Calculates level details based on cumulative XP.
 * Formula: XP needed for next level = currentLevel * 100
 */
export function calculateLevelInfo(cumulativeXp: number): LevelInfo {
  let level = 1;
  let xp = Math.max(0, cumulativeXp);

  while (true) {
    const xpNeeded = level * 100;
    if (xp >= xpNeeded) {
      xp -= xpNeeded;
      level++;
    } else {
      break;
    }
  }

  const xpNeededForNext = level * 100;
  const percent = Math.round((xp / xpNeededForNext) * 100);

  return {
    level,
    currentXp: xp,
    xpNeededForNext,
    percent,
  };
}

export interface RankDetails {
  letter: string;
  rank: string;
  title: string;
  desc: string;
  themeClass: string;
  shadowClass: string;
}

export function getRankFromLevel(level: number): string {
  if (level < 10) return 'E';
  if (level < 20) return 'D';
  if (level < 30) return 'C';
  if (level < 40) return 'B';
  if (level < 50) return 'A';
  if (level < 60) return 'S';
  if (level < 70) return 'National Hunter';
  if (level < 80) return 'Monarch Candidate';
  return 'Shadow Monarch';
}

export function getRankDetails(level: number): RankDetails {
  const rank = getRankFromLevel(level);
  switch (rank) {
    case 'E':
      return {
        letter: 'E',
        rank,
        title: 'RANK E - AWAKENING',
        desc: 'The weakest hunter. Every legend starts here. Begin your first quests to rise.',
        themeClass: 'text-cyan-400 border-cyan-500/50 bg-cyan-950/20',
        shadowClass: 'shadow-[0_0_12px_rgba(34,211,238,0.3)]',
      };
    case 'D':
      return {
        letter: 'D',
        rank,
        title: 'RANK D - APPRENTICE',
        desc: 'The system has noticed you. Momentum is building - do not stop now.',
        themeClass: 'text-sky-400 border-sky-500/50 bg-sky-950/20',
        shadowClass: 'shadow-[0_0_12px_rgba(56,189,248,0.3)]',
      };
    case 'C':
      return {
        letter: 'C',
        rank,
        title: 'RANK C - CONTENDER',
        desc: 'Halfway through the trial. Your stats are climbing fast. Push harder.',
        themeClass: 'text-blue-400 border-blue-500/50 bg-blue-950/20',
        shadowClass: 'shadow-[0_0_12px_rgba(96,165,250,0.3)]',
      };
    case 'B':
      return {
        letter: 'B',
        rank,
        title: 'RANK B - VETERAN',
        desc: 'Few make it this far. The final gauntlet awaits - finish strong.',
        themeClass: 'text-indigo-400 border-indigo-500/50 bg-indigo-950/20',
        shadowClass: 'shadow-[0_0_12px_rgba(129,140,248,0.3)]',
      };
    case 'A':
      return {
        letter: 'A',
        rank,
        title: 'RANK A - ELITE',
        desc: 'A high-ranking hunter. Your power commands respect across the association.',
        themeClass: 'text-violet-400 border-violet-500/50 bg-violet-950/20',
        shadowClass: 'shadow-[0_0_12px_rgba(167,139,250,0.3)]',
      };
    case 'S':
      return {
        letter: 'S',
        rank,
        title: 'RANK S - MONARCH',
        desc: 'An elite S-Rank hunter. Your name is known globally. The peak is in sight.',
        themeClass: 'text-purple-400 border-purple-500/50 bg-purple-950/20',
        shadowClass: 'shadow-[0_0_15px_rgba(192,132,252,0.4)]',
      };
    case 'National Hunter':
      return {
        letter: 'N',
        rank,
        title: 'NATIONAL LEVEL HUNTER',
        desc: "A hunter equal in strength to a nation's army. A force of nature.",
        themeClass: 'text-amber-400 border-amber-500/50 bg-amber-950/20',
        shadowClass: 'shadow-[0_0_18px_rgba(251,191,36,0.45)]',
      };
    case 'Monarch Candidate':
      return {
        letter: 'MC',
        rank,
        title: 'MONARCH CANDIDATE',
        desc: 'The power of ancient entities flows through you. You transcend humanity.',
        themeClass: 'text-rose-500 border-rose-500/50 bg-rose-950/20',
        shadowClass: 'shadow-[0_0_18px_rgba(244,63,94,0.45)]',
      };
    case 'Shadow Monarch':
    default:
      return {
        letter: 'SM',
        rank,
        title: 'SHADOW MONARCH',
        desc: 'ALL LIMITS BROKEN. You are the Ruler of the Shadows. Arise.',
        themeClass: 'text-fuchsia-400 border-fuchsia-500/50 bg-fuchsia-950/20',
        shadowClass: 'shadow-[0_0_25px_rgba(232,121,249,0.6)]',
      };
  }
}

/**
 * Returns the XP reward based on quest difficulty.
 */
export function getXpReward(difficulty: 'E' | 'D' | 'C' | 'B' | 'A' | 'S', type: 'daily' | 'weekly'): number {
  const baseRewards = {
    E: 10,
    D: 25,
    C: 50,
    B: 100,
    A: 200,
    S: 500,
  };

  const multiplier = type === 'weekly' ? 3 : 1;
  return baseRewards[difficulty] * multiplier;
}

/**
 * Calculates XP bonus earned based on sleep hours.
 * - 4 hours: 0 XP (no bonus)
 * - 5-6 hours: 50 XP (half bonus)
 * - 7-9 hours: 100 XP (full bonus)
 */
export function getSleepXpBonus(hours: number): number {
  if (hours >= 7) return 100;
  if (hours >= 5) return 50;
  return 0;
}
