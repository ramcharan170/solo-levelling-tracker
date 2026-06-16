'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Terminal, BarChart2, Flame, Award, Bed, Target } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '@/components/AuthProvider';
import { calculateLevelInfo, getRankDetails } from '@/lib/gameplay';
import { createClient } from '@/lib/supabase/client';

interface QuestData {
  id: string;
  category: string;
  xp_reward: number;
  is_completed: boolean;
  completed_at: string | null;
}

interface SleepData {
  date: string;
  hours: number;
  xp_bonus: number;
}

interface DailyLogData {
  date: string;
  webdev_completed: boolean;
  jog_completed: boolean;
}

interface ChartItem {
  name: string;
  xp?: number;
  hours?: number;
}

export default function StatsPage() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [mounted, setMounted] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  // Computed Stats
  const [totalQuests, setTotalQuests] = useState(0);
  const [completedQuestsCount, setCompletedQuestsCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [averageSleep, setAverageSleep] = useState(0);
  const [monthlyXpEarned, setMonthlyXpEarned] = useState(0);
  const [perfectTrainingDays, setPerfectTrainingDays] = useState(0);

  // Chart Data
  const [xpChartData, setXpChartData] = useState<ChartItem[]>([]);
  const [sleepChartData, setSleepChartData] = useState<ChartItem[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  
  // Category Mastery lists
  const [categoryMastery, setCategoryMastery] = useState<Array<{ name: string; completed: number; total: number }>>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Protect Route
  useEffect(() => {
    if (!loading && !session) {
      router.push('/auth/login');
    }
  }, [session, loading, router]);

  const getYearMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const fetchAndComputeStats = useCallback(async () => {
    if (!session?.user?.id) return;
    setStatsLoading(true);

    try {
      const userId = session.user.id;
      const yearMonth = getYearMonth();
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const startDate = `${yearMonth}-01`;
      const endDate = `${yearMonth}-${String(daysInMonth).padStart(2, '0')}`;

      // 1. Fetch Quests
      const { data: questsData, error: questsError } = await supabase
        .from('quests')
        .select('id, category, xp_reward, is_completed, completed_at')
        .eq('user_id', userId);

      if (questsError) throw questsError;

      // 2. Fetch Sleep Logs
      const { data: sleepLogs, error: sleepError } = await supabase
        .from('sleep_logs')
        .select('date, hours, xp_bonus')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (sleepError) throw sleepError;

      // 3. Fetch Daily Logs
      const { data: dailyLogs, error: dailyError } = await supabase
        .from('daily_logs')
        .select('date, webdev_completed, jog_completed')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (dailyError) throw dailyError;

      // --- COMPUTE STATISTICS ---
      
      // Quest Completion summary
      const allQuests = (questsData as QuestData[]) || [];
      setTotalQuests(allQuests.length);
      
      const completedQuests = allQuests.filter((q) => q.is_completed);
      setCompletedQuestsCount(completedQuests.length);

      // Category breakdowns & masteries
      const categories = ['AI/RAG', 'Web Dev', 'Automation', 'Fitness', 'Custom'];
      const mastery = categories.map((cat) => {
        const catQuests = allQuests.filter((q) => q.category === cat);
        const catCompleted = catQuests.filter((q) => q.is_completed).length;
        return {
          name: cat,
          completed: catCompleted,
          total: catQuests.length,
        };
      });
      setCategoryMastery(mastery);

      // Pie chart distribution
      const pieDist = mastery
        .filter((m) => m.completed > 0)
        .map((m) => ({
          name: m.name,
          value: m.completed,
        }));
      setPieData(pieDist);

      // Sleep summaries
      const logsSleep = (sleepLogs as SleepData[]) || [];
      const totalSleepHours = logsSleep.reduce((acc, curr) => acc + Number(curr.hours), 0);
      setAverageSleep(logsSleep.length > 0 ? totalSleepHours / logsSleep.length : 0);

      // Daily logs perfect day streaks
      const logsDaily = (dailyLogs as DailyLogData[]) || [];
      
      // Calculate perfect day status mapped by day
      const perfectDayMap: { [day: number]: boolean } = {};
      logsDaily.forEach((log) => {
        const day = parseInt(log.date.split('-')[2], 10);
        perfectDayMap[day] = log.webdev_completed && log.jog_completed;
      });
      setPerfectTrainingDays(Object.values(perfectDayMap).filter(Boolean).length);

      let currentPerfectStreak = 0;
      let maxPerfectStreak = 0;
      let tempStreak = 0;
      
      // Assuming today is dayNum
      const todayDay = new Date().getDate();

      // Find current streak by counting backwards from today
      let checkingDay = todayDay;
      while (checkingDay >= 1) {
        if (perfectDayMap[checkingDay]) {
          currentPerfectStreak++;
          checkingDay--;
        } else {
          // If they haven't completed today yet, check yesterday to preserve yesterday's streak
          if (checkingDay === todayDay) {
            checkingDay--;
            continue;
          }
          break;
        }
      }

      // Max Streak loop
      for (let d = 1; d <= daysInMonth; d++) {
        if (perfectDayMap[d]) {
          tempStreak++;
          if (tempStreak > maxPerfectStreak) {
            maxPerfectStreak = tempStreak;
          }
        } else {
          tempStreak = 0;
        }
      }
      setCurrentStreak(currentPerfectStreak);
      setLongestStreak(maxPerfectStreak);

      // --- CHART 1: SLEEP TREND DATA ---
      const sleepChart: ChartItem[] = [];
      const sleepMap: { [day: number]: number } = {};
      logsSleep.forEach((log) => {
        const day = parseInt(log.date.split('-')[2], 10);
        sleepMap[day] = Number(log.hours);
      });

      for (let i = 1; i <= daysInMonth; i++) {
        sleepChart.push({
          name: `D${i}`,
          hours: sleepMap[i] ?? 0,
        });
      }
      setSleepChartData(sleepChart);

      // --- CHART 2: XP PROGRESSION DATA ---
      // We will construct daily XP progression by sorting all completed events
      // and accumulating values.
      const xpEvents: Array<{ day: number; xp: number }> = [];

      // Add quest events
      completedQuests.forEach((q) => {
        if (q.completed_at) {
          const dateParts = q.completed_at.split('T')[0].split('-');
          // Only count events in the current month
          if (`${dateParts[0]}-${dateParts[1]}` === yearMonth) {
            xpEvents.push({
              day: parseInt(dateParts[2], 10),
              xp: q.xp_reward,
            });
          }
        }
      });

      // Add sleep events
      logsSleep.forEach((s) => {
        const dateParts = s.date.split('-');
        xpEvents.push({
          day: parseInt(dateParts[2], 10),
          xp: s.xp_bonus,
        });
      });

      // Map accumulated XP to days
      const xpMap: { [day: number]: number } = {};
      xpEvents.forEach((ev) => {
        xpMap[ev.day] = (xpMap[ev.day] ?? 0) + ev.xp;
      });
      setMonthlyXpEarned(xpEvents.reduce((sum, event) => sum + event.xp, 0));

      const xpChart: ChartItem[] = [];
      let runningXpSum = 0;

      for (let i = 1; i <= daysInMonth; i++) {
        runningXpSum += xpMap[i] ?? 0;
        xpChart.push({
          name: `D${i}`,
          xp: runningXpSum,
        });
      }
      setXpChartData(xpChart);

    } catch (err) {
      console.error('Failed to load statistics database events:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [session, supabase]);

  useEffect(() => {
    if (session) {
      fetchAndComputeStats();
    }
  }, [session, fetchAndComputeStats]);

  if (loading || !session || !profile || !mounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-system-bg text-system-text font-mono">
        <div className="flex items-center gap-2.5 text-system-cyan animate-pulse">
          <Terminal size={20} className="text-system-cyan" />
          <span className="tracking-widest uppercase text-sm font-bold">[ SECURING HUD CHANNEL... ]</span>
        </div>
      </div>
    );
  }

  // Colors for Recharts Pie
  const COLORS = ['#7dd3fc', '#10b981', '#fbbf24', '#ef4444', '#a78bfa'];

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6 font-sans">
      {/* HUD NAV BAR */}
      <div className="flex justify-between items-center border border-system-border bg-system-card px-4 py-3 rounded-lg shadow-cyan/5 shadow">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-system-panel border border-system-border hover:border-system-cyan/50 hover:text-system-cyan text-system-textMuted text-xs font-bold tracking-wider rounded cursor-pointer transition-all"
        >
          <ArrowLeft size={13} />
          <span>DASHBOARD</span>
        </Link>

        <div className="flex items-center gap-2 text-system-cyan font-mono text-xs font-bold tracking-widest uppercase">
          <BarChart2 size={14} />
          <span>HUD // STATISTICS</span>
        </div>
      </div>

      {statsLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 font-mono text-xs text-system-muted animate-pulse">
          <Terminal className="text-system-cyan w-8 h-8 mb-2 animate-bounce" />
          <span>EXTRACTING DATA TRENDS FROM THE SYSTEM...</span>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Completed Quests Card */}
            <div className="p-4 bg-system-card border border-system-border rounded-lg space-y-1 text-center">
              <Award className="w-5 h-5 text-cyan-400 mx-auto" />
              <div className="text-lg font-mono font-black text-cyan-400 drop-shadow-[0_0_5px_rgba(125,211,252,0.2)]">
                {completedQuestsCount} / {totalQuests}
              </div>
              <div className="text-[9px] tracking-wider text-system-muted uppercase font-bold">
                QUESTS CLEARED
              </div>
            </div>

            {/* Current Perfect Streak Card */}
            <div className="p-4 bg-system-card border border-system-border rounded-lg space-y-1 text-center">
              <Flame className="w-5 h-5 text-amber-400 mx-auto animate-pulse" />
              <div className="text-lg font-mono font-black text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.2)]">
                {currentStreak} days
              </div>
              <div className="text-[9px] tracking-wider text-system-muted uppercase font-bold">
                CURRENT PERFECT STREAK
              </div>
            </div>

            {/* Longest Perfect Streak Card */}
            <div className="p-4 bg-system-card border border-system-border rounded-lg space-y-1 text-center">
              <Target className="w-5 h-5 text-emerald-400 mx-auto" />
              <div className="text-lg font-mono font-black text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.2)]">
                {longestStreak} days
              </div>
              <div className="text-[9px] tracking-wider text-system-muted uppercase font-bold">
                LONGEST PERFECT STREAK
              </div>
            </div>

            {/* Avg Sleep Card */}
            <div className="p-4 bg-system-card border border-system-border rounded-lg space-y-1 text-center">
              <Bed className="w-5 h-5 text-purpleGlow mx-auto" />
              <div className="text-lg font-mono font-black text-purpleGlow drop-shadow-[0_0_5px_rgba(167,139,250,0.2)]">
                {averageSleep.toFixed(1)} hrs
              </div>
              <div className="text-[9px] tracking-wider text-system-muted uppercase font-bold">
                AVG SLEEP DURATION
              </div>
            </div>
          </div>

          {/* MONTHLY SUMMARY */}
          <div className="p-5 bg-system-card border border-system-border rounded-lg">
            <div className="text-xs text-system-cyan tracking-wider font-mono font-bold uppercase mb-4">
              [ MONTHLY PROGRESS SUMMARY ]
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="bg-system-panel border border-system-border/60 rounded p-3">
                <div className="text-lg font-mono font-black text-system-cyan">{monthlyXpEarned}</div>
                <div className="text-[9px] text-system-muted uppercase tracking-wider font-bold">XP Earned</div>
              </div>
              <div className="bg-system-panel border border-system-border/60 rounded p-3">
                <div className="text-lg font-mono font-black text-emerald-400">{perfectTrainingDays}</div>
                <div className="text-[9px] text-system-muted uppercase tracking-wider font-bold">Perfect Days</div>
              </div>
              <div className="bg-system-panel border border-system-border/60 rounded p-3">
                <div className="text-lg font-mono font-black text-purpleGlow">{sleepChartData.filter((day) => (day.hours ?? 0) > 0).length}</div>
                <div className="text-[9px] text-system-muted uppercase tracking-wider font-bold">Sleep Logs</div>
              </div>
              <div className="bg-system-panel border border-system-border/60 rounded p-3">
                <div className="text-lg font-mono font-black text-amber-400">{completedQuestsCount}</div>
                <div className="text-[9px] text-system-muted uppercase tracking-wider font-bold">Quests Done</div>
              </div>
            </div>
          </div>

          {/* XP PROGRESSION GRAPH */}
          <div className="p-5 bg-system-card border border-system-border rounded-lg space-y-4">
            <div className="text-xs text-system-cyan tracking-wider font-mono font-bold uppercase">
              [ MONTHLY XP PROGRESSION ]
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={xpChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7dd3fc" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7dd3fc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#5a6b8c" fontSize={10} tickLine={false} />
                  <YAxis stroke="#5a6b8c" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0e14',
                      borderColor: '#2a3f5f',
                      color: '#e2e8f0',
                      fontSize: 11,
                      fontFamily: 'monospace',
                    }}
                    labelStyle={{ color: '#5a6b8c' }}
                  />
                  <Area type="monotone" dataKey="xp" stroke="#7dd3fc" strokeWidth={2} fillOpacity={1} fill="url(#colorXp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SLEEP TREND GRAPH & QUEST CATEGORIES BREAKDOWN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sleep Trend BarChart */}
            <div className="p-5 bg-system-card border border-system-border rounded-lg space-y-4">
              <div className="text-xs text-system-cyan tracking-wider font-mono font-bold uppercase">
                [ MONTHLY SLEEP DURATION ]
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sleepChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#5a6b8c" fontSize={9} tickLine={false} />
                    <YAxis domain={[0, 10]} stroke="#5a6b8c" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0a0e14',
                        borderColor: '#2a3f5f',
                        color: '#e2e8f0',
                        fontSize: 11,
                        fontFamily: 'monospace',
                      }}
                      labelStyle={{ color: '#5a6b8c' }}
                    />
                    <Bar dataKey="hours" fill="#8b5cf6" radius={[2, 2, 0, 0]} maxBarSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quest Categories mastery and Pie Chart */}
            <div className="p-5 bg-system-card border border-system-border rounded-lg flex flex-col justify-between">
              <div className="text-xs text-system-cyan tracking-wider font-mono font-bold uppercase mb-4">
                [ QUEST TYPE ANALYSIS ]
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Pie Chart display */}
                {pieData.length > 0 ? (
                  <div className="w-32 h-32 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={28}
                          outerRadius={45}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-[10px] text-system-muted font-mono h-32 flex items-center justify-center shrink-0 w-32 border border-dashed border-system-border/40 rounded">
                    NO COMPLETED DATA
                  </div>
                )}

                {/* Categories progress bars */}
                <div className="flex-1 w-full space-y-2.5">
                  {categoryMastery.map((cat, idx) => {
                    const percent = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
                    return (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex justify-between items-baseline text-[10px] font-mono">
                          <span className="text-system-text font-semibold tracking-wide">{cat.name}</span>
                          <span className="text-system-muted font-bold">{cat.completed} / {cat.total} ({percent}%)</span>
                        </div>
                        <div className="h-2 bg-system-panel border border-system-border/60 rounded overflow-hidden">
                          <div
                            className="h-full transition-all duration-500 ease-out"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: COLORS[idx % COLORS.length],
                              boxShadow: `0 0 5px ${COLORS[idx % COLORS.length]}80`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
