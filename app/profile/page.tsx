'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Award, Save, Terminal, User } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { AchievementRecord } from '@/lib/achievements';
import { calculateLevelInfo, getRankDetails } from '@/lib/gameplay';

interface DailyLogRow {
  date: string;
  webdev_completed: boolean;
  jog_completed: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { session, profile, loading, refreshProfile } = useAuth();
  const [hunterName, setHunterName] = useState('');
  const [saving, setSaving] = useState(false);
  const [achievementHistory, setAchievementHistory] = useState<AchievementRecord[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!loading && !session) {
      router.push('/auth/login');
    }
  }, [session, loading, router]);

  useEffect(() => {
    if (profile?.username) {
      setHunterName(profile.username);
    }
  }, [profile]);

  const calculateStreaks = (rows: DailyLogRow[]) => {
    const perfectDates = new Set(
      rows
        .filter((row) => row.webdev_completed && row.jog_completed)
        .map((row) => row.date)
    );

    const sortedDates = Array.from(perfectDates).sort();
    let best = 0;
    let run = 0;
    let previous: Date | null = null;

    sortedDates.forEach((date) => {
      const current = new Date(`${date}T00:00:00`);
      if (previous) {
        const diffDays = Math.round((current.getTime() - previous.getTime()) / 86400000);
        run = diffDays === 1 ? run + 1 : 1;
      } else {
        run = 1;
      }
      best = Math.max(best, run);
      previous = current;
    });

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

    setCurrentStreak(currentRun);
    setLongestStreak(best);
  };

  const loadProfileStats = useCallback(async () => {
    if (!session?.user?.id) return;
    setProfileLoading(true);

    const [{ data: achievements }, { data: dailyLogs }] = await Promise.all([
      supabase
        .from('user_achievements')
        .select('id, code, title, description, unlocked_at')
        .eq('user_id', session.user.id)
        .order('unlocked_at', { ascending: false }),
      supabase
        .from('daily_logs')
        .select('date, webdev_completed, jog_completed')
        .eq('user_id', session.user.id)
        .order('date', { ascending: true }),
    ]);

    setAchievementHistory((achievements ?? []) as AchievementRecord[]);
    calculateStreaks((dailyLogs ?? []) as DailyLogRow[]);
    setProfileLoading(false);
  }, [session, supabase]);

  useEffect(() => {
    loadProfileStats();
  }, [loadProfileStats]);

  const handleSaveName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.user?.id || !hunterName.trim()) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ username: hunterName.trim(), updated_at: new Date().toISOString() })
      .eq('id', session.user.id);

    if (error) {
      console.error('Failed to update hunter name:', error);
    } else {
      await refreshProfile();
    }
    setSaving(false);
  };

  if (loading || !session || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-system-bg text-system-text font-mono">
        <div className="flex items-center gap-2.5 text-system-cyan animate-pulse">
          <Terminal size={20} className="text-system-cyan" />
          <span className="tracking-widest uppercase text-sm font-bold">[ LOADING HUNTER PROFILE... ]</span>
        </div>
      </div>
    );
  }

  const levelInfo = calculateLevelInfo(profile.xp);
  const rank = getRankDetails(levelInfo.level);
  const joinDate = session.user.created_at
    ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(session.user.created_at))
    : 'Unknown';

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6 font-sans">
      <div className="flex justify-between items-center border border-system-border bg-system-card px-4 py-3 rounded-lg shadow-cyan/5 shadow">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-system-panel border border-system-border hover:border-system-cyan/50 hover:text-system-cyan text-system-textMuted text-xs font-bold tracking-wider rounded cursor-pointer transition-all"
        >
          <ArrowLeft size={13} />
          <span>DASHBOARD</span>
        </Link>
        <div className="flex items-center gap-2 text-system-cyan font-mono text-xs font-bold tracking-widest uppercase">
          <User size={14} />
          <span>HUD // PROFILE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 p-5 bg-system-card border border-system-border rounded-lg space-y-5">
          <div className={`w-20 h-20 border-2 rounded flex items-center justify-center font-mono font-black text-4xl ${rank.themeClass} ${rank.shadowClass}`}>
            {rank.letter}
          </div>
          <form onSubmit={handleSaveName} className="space-y-3">
            <label className="text-[10px] uppercase tracking-wider text-system-muted font-bold block">Hunter Name</label>
            <input
              value={hunterName}
              onChange={(event) => setHunterName(event.target.value)}
              maxLength={40}
              className="w-full px-3 py-2 bg-system-bg border border-system-border rounded text-sm text-system-text focus:outline-none focus:border-system-cyan"
            />
            <button
              type="submit"
              disabled={saving || !hunterName.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 bg-system-panel border border-system-cyan/60 text-system-cyan text-xs font-mono font-bold tracking-wider rounded disabled:opacity-60"
            >
              <Save size={13} />
              {saving ? 'SAVING...' : 'SAVE NAME'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Rank', rank.rank],
            ['Level', String(levelInfo.level)],
            ['Total XP', String(profile.xp)],
            ['Current Streak', `${currentStreak}d`],
            ['Longest Streak', `${longestStreak}d`],
            ['Achievements', String(achievementHistory.length)],
            ['Join Date', joinDate],
            ['Progress', `${levelInfo.percent}%`],
          ].map(([label, value]) => (
            <div key={label} className="p-4 bg-system-card border border-system-border rounded-lg text-center">
              <div className="text-base font-mono font-black text-system-cyan">{profileLoading && label.includes('Streak') ? '...' : value}</div>
              <div className="text-[9px] uppercase tracking-wider text-system-muted font-bold mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 bg-system-card border border-system-border rounded-lg space-y-4">
        <div className="flex items-center gap-2 text-xs text-system-cyan tracking-wider font-mono font-bold uppercase">
          <Award size={15} />
          <span>[ ACHIEVEMENT HISTORY ]</span>
        </div>

        {profileLoading ? (
          <div className="py-8 text-center text-xs font-mono text-system-muted animate-pulse">LOADING UNLOCK HISTORY...</div>
        ) : achievementHistory.length === 0 ? (
          <div className="py-10 border border-dashed border-system-border/50 rounded text-center text-xs font-mono text-system-muted">
            NO ACHIEVEMENTS UNLOCKED YET.
          </div>
        ) : (
          <div className="space-y-2">
            {achievementHistory.map((achievement) => (
              <div key={achievement.id} className="flex items-start gap-3 p-3 bg-system-panel border border-system-border/70 rounded">
                <Award className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-system-text">{achievement.title}</div>
                  <div className="text-xs text-system-textMuted">{achievement.description}</div>
                </div>
                <div className="text-[10px] text-system-muted font-mono shrink-0">
                  {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(achievement.unlocked_at))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
