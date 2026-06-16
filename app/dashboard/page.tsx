'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Terminal, RefreshCw, BarChart2, User } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { calculateLevelInfo, getRankDetails } from '@/lib/gameplay';
import { createClient } from '@/lib/supabase/client';
import RankHeader from '@/components/RankHeader';
import QuestList from '@/components/QuestList';
import DailyLog from '@/components/DailyLog';
import SleepTracker from '@/components/SleepTracker';
import LevelUpOverlay from '@/components/LevelUpOverlay';
import AchievementToast from '@/components/AchievementToast';
import { AchievementRecord, unlockMissingAchievements } from '@/lib/achievements';

export default function DashboardPage() {
  const router = useRouter();
  const { session, profile, loading, signOut, refreshProfile } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  // Streaks State
  const [webdevStreak, setWebdevStreak] = useState(0);
  const [jogStreak, setJogStreak] = useState(0);
  const [perfectDays, setPerfectDays] = useState(0);

  // Overlay Triggers
  const [levelUpActive, setLevelUpActive] = useState(false);
  const [levelUpRankTitle, setLevelUpRankTitle] = useState('');
  const [perfectDayActive, setPerfectDayActive] = useState(false);
  const [perfectDayNum, setPerfectDayNum] = useState(0);

  // local copy of XP for instantaneous UI feedback
  const [localXp, setLocalXp] = useState<number | null>(null);
  const [achievementToast, setAchievementToast] = useState<AchievementRecord | null>(null);
  const [achievementRefreshKey, setAchievementRefreshKey] = useState(0);

  // Sync localXp with database profile XP on load/refresh
  useEffect(() => {
    if (profile) {
      setLocalXp(profile.xp);
    }
  }, [profile]);

  // Protect route
  useEffect(() => {
    if (!loading && !session) {
      router.push('/auth/login');
    }
  }, [session, loading, router]);

  if (loading || !session || localXp === null || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-system-bg text-system-text font-mono">
        <div className="flex items-center gap-2.5 text-system-cyan animate-pulse">
          <Terminal size={20} className="text-system-cyan" />
          <span className="tracking-widest uppercase text-sm font-bold">[ LOAD_USER_HUD_INTERFACE... ]</span>
        </div>
      </div>
    );
  }

  const handleXpChange = (xpChange: number) => {
    const previousXp = localXp;
    const newXp = Math.max(0, previousXp + xpChange);
    
    // Check for level up
    const oldLevelInfo = calculateLevelInfo(previousXp);
    const newLevelInfo = calculateLevelInfo(newXp);

    setLocalXp(newXp);

    if (newLevelInfo.level > oldLevelInfo.level) {
      const rankInfo = getRankDetails(newLevelInfo.level);
      setLevelUpRankTitle(rankInfo.title);
      setLevelUpActive(true);
      
      // Update level and rank in database profile
      supabase
        .from('profiles')
        .update({
          level: newLevelInfo.level,
          rank: getRankDetails(newLevelInfo.level).rank,
        })
        .eq('id', session.user.id)
        .then(() => {
          refreshProfile();
        });
    } else {
      refreshProfile();
    }
    setAchievementRefreshKey((key) => key + 1);
  };

  const handlePerfectDay = (dayNum: number) => {
    setPerfectDayNum(dayNum);
    setPerfectDayActive(true);
    setAchievementRefreshKey((key) => key + 1);
  };

  useEffect(() => {
    if (!session?.user?.id || !profile || localXp === null) return;

    const checkAchievements = async () => {
      const userId = session.user.id;
      const now = new Date();
      const year = now.getFullYear();
      const monthIndex = now.getMonth();
      const month = String(monthIndex + 1).padStart(2, '0');
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-${String(daysInMonth).padStart(2, '0')}`;

      try {
        const [{ data: quests }, { data: dailyLogs }, { data: sleepLogs }] = await Promise.all([
          supabase.from('quests').select('id, is_completed').eq('user_id', userId),
          supabase
            .from('daily_logs')
            .select('date, webdev_completed, jog_completed')
            .eq('user_id', userId)
            .gte('date', startDate)
            .lte('date', endDate),
          supabase
            .from('sleep_logs')
            .select('date, hours')
            .eq('user_id', userId)
            .gte('date', startDate)
            .lte('date', endDate),
        ]);

        const perfectDays = new Set(
          (dailyLogs ?? [])
            .filter((log: any) => log.webdev_completed && log.jog_completed)
            .map((log: any) => Number(log.date.split('-')[2]))
        );

        let longestStreak = 0;
        let run = 0;
        for (let day = 1; day <= daysInMonth; day++) {
          if (perfectDays.has(day)) {
            run++;
            longestStreak = Math.max(longestStreak, run);
          } else {
            run = 0;
          }
        }

        let currentStreak = 0;
        for (let day = now.getDate(); day >= 1; day--) {
          if (perfectDays.has(day)) {
            currentStreak++;
          } else if (day !== now.getDate()) {
            break;
          }
        }

        const levelInfo = calculateLevelInfo(localXp);
        const unlocked = await unlockMissingAchievements(supabase, userId, {
          completedQuests: (quests ?? []).filter((quest: any) => quest.is_completed).length,
          currentStreak,
          longestStreak,
          level: levelInfo.level,
          rank: getRankDetails(levelInfo.level).rank,
          sleepConsistencyDays: (sleepLogs ?? []).filter((log: any) => Number(log.hours) >= 7).length,
        });

        if (unlocked.length > 0) {
          setAchievementToast(unlocked[0]);
          window.setTimeout(() => setAchievementToast(null), 3600);
        }
      } catch (error) {
        console.error('Failed to evaluate achievements:', error);
      }
    };

    checkAchievements();
  }, [achievementRefreshKey, localXp, profile, session, supabase]);

  const handleResetProgress = async () => {
    if (
      confirm(
        'WARNING: This will reset all quest completions, clear your attendance and sleep logs, and set your level back to 1. Are you sure you want to proceed?'
      )
    ) {
      try {
        // 1. Uncheck all quests
        const { error: questError } = await supabase
          .from('quests')
          .update({ is_completed: false, completed_at: null })
          .eq('user_id', session.user.id);
        
        if (questError) throw questError;

        // 2. Clear daily logs
        const { error: logsError } = await supabase
          .from('daily_logs')
          .delete()
          .eq('user_id', session.user.id);

        if (logsError) throw logsError;

        // 3. Clear sleep logs
        const { error: sleepError } = await supabase
          .from('sleep_logs')
          .delete()
          .eq('user_id', session.user.id);

        if (sleepError) throw sleepError;

        // 4. Clear achievements
        const { error: achievementError } = await supabase
          .from('user_achievements')
          .delete()
          .eq('user_id', session.user.id);

        if (achievementError) throw achievementError;

        // 5. Reset profile stats
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ xp: 0, level: 1, rank: 'E', daily_streak: 0 })
          .eq('id', session.user.id);

        if (profileError) throw profileError;

        setLocalXp(0);
        window.location.reload();
      } catch (err) {
        console.error('Failed to reset system data:', err);
      }
    }
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6 font-sans">
      {/* HUD NAV BAR */}
      <div className="flex justify-between items-center border border-system-border bg-system-card px-4 py-3 rounded-lg shadow-cyan/5 shadow">
        <div className="flex items-center gap-2 text-system-cyan font-mono text-xs font-bold tracking-widest">
          <Terminal size={14} />
          <span>HUD // ACTIVE STATUS</span>
        </div>
        
        <div className="flex items-center gap-2.5">
          <Link
            href="/stats"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-system-panel border border-system-border hover:border-system-cyan/50 hover:text-system-cyan text-system-textMuted text-xs font-bold tracking-wider rounded cursor-pointer transition-all"
          >
            <BarChart2 size={13} />
            <span>STATISTICS</span>
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-system-panel border border-system-border hover:border-system-cyan/50 hover:text-system-cyan text-system-textMuted text-xs font-bold tracking-wider rounded cursor-pointer transition-all"
          >
            <User size={13} />
            <span>PROFILE</span>
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-system-panel border border-system-border hover:border-red-500/50 hover:text-red-400 text-system-textMuted text-xs font-bold tracking-wider rounded cursor-pointer transition-all"
          >
            <LogOut size={13} />
            <span>LOGOUT</span>
          </button>
        </div>
      </div>

      {/* CORE CONTENT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats & Quests */}
        <div className="lg:col-span-2 space-y-6">
          <RankHeader
            xp={localXp}
            username={profile.username}
            webdevStreak={webdevStreak}
            jogStreak={jogStreak}
            perfectDays={perfectDays}
          />
          <QuestList
            userId={session.user.id}
            onXpChange={handleXpChange}
          />
        </div>

        {/* Right Column: 30-Day Training Attendance Log & Sleep Log */}
        <div className="lg:col-span-1 space-y-6">
          <SleepTracker
            userId={session.user.id}
            onXpChange={handleXpChange}
            onSleepLogged={() => setAchievementRefreshKey((key) => key + 1)}
          />
          <DailyLog
            userId={session.user.id}
            onStreaksCalculated={(webdev, jog, perfect) => {
              setWebdevStreak(webdev);
              setJogStreak(jog);
              setPerfectDays(perfect);
            }}
            onPerfectDay={handlePerfectDay}
            onLogChange={() => setAchievementRefreshKey((key) => key + 1)}
          />
        </div>
      </div>

      {/* RESET CONTROL */}
      <button
        onClick={handleResetProgress}
        className="w-48 py-2 mx-auto mt-6 border border-system-border/80 hover:border-red-500/80 text-system-muted hover:text-red-400 bg-system-panel hover:bg-red-500/5 flex items-center justify-center gap-2 text-xs font-mono font-bold tracking-widest rounded cursor-pointer transition-all"
      >
        <RefreshCw size={12} />
        RESET ALL DATA
      </button>

      {/* SYSTEM OVERLAYS */}
      <LevelUpOverlay
        levelUpActive={levelUpActive}
        perfectDayActive={perfectDayActive}
        levelUpRankTitle={levelUpRankTitle}
        perfectDayNum={perfectDayNum}
        onCloseLevelUp={() => setLevelUpActive(false)}
        onClosePerfectDay={() => setPerfectDayActive(false)}
      />
      <AchievementToast achievement={achievementToast} />
    </div>
  );
}
