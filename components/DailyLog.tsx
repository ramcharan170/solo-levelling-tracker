'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface DailyLogProps {
  userId: string;
  onStreaksCalculated: (webdev: number, jog: number, perfect: number) => void;
  onPerfectDay: (dayNum: number) => void;
  onLogChange?: () => void;
}

interface LogMap {
  [dayNum: number]: {
    webdev: boolean;
    jog: boolean;
  };
}

export default function DailyLog({ userId, onStreaksCalculated, onPerfectDay, onLogChange }: DailyLogProps) {
  const [logs, setLogs] = useState<LogMap>({});
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const supabase = useMemo(() => createClient(), []);

  const getMonthMeta = () => {
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = now.getMonth();
    const month = String(monthIndex + 1).padStart(2, '0');
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return { yearMonth: `${year}-${month}`, daysInMonth };
  };

  const calculateAndReportStreaks = useCallback(
    (logData: LogMap, daysInMonth: number) => {
      let webdevStreak = 0;
      let currentWebdev = 0;
      let jogStreak = 0;
      let currentJog = 0;
      let perfectDays = 0;

      for (let i = 1; i <= daysInMonth; i++) {
        const day = logData[i];
        if (!day) continue;

        if (day.webdev) {
          currentWebdev++;
          webdevStreak = Math.max(webdevStreak, currentWebdev);
        } else {
          currentWebdev = 0;
        }

        if (day.jog) {
          currentJog++;
          jogStreak = Math.max(jogStreak, currentJog);
        } else {
          currentJog = 0;
        }

        if (day.webdev && day.jog) perfectDays++;
      }

      onStreaksCalculated(webdevStreak, jogStreak, perfectDays);
    },
    [onStreaksCalculated]
  );

  const fetchLogs = useCallback(async () => {
    const { yearMonth, daysInMonth } = getMonthMeta();
    const startDate = `${yearMonth}-01`;
    const endDate = `${yearMonth}-${String(daysInMonth).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('Error fetching daily logs:', error);
      return;
    }

    const logMap: LogMap = {};
    for (let i = 1; i <= daysInMonth; i++) {
      logMap[i] = { webdev: false, jog: false };
    }

    data?.forEach((row: any) => {
      const dayNum = parseInt(row.date.split('-')[2], 10);
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        logMap[dayNum] = {
          webdev: row.webdev_completed,
          jog: row.jog_completed,
        };
      }
    });

    setLogs(logMap);
    calculateAndReportStreaks(logMap, daysInMonth);
  }, [userId, supabase, calculateAndReportStreaks]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleToggle = async (dayNum: number, field: 'webdev' | 'jog') => {
    const key = `${dayNum}-${field}`;
    if (saving[key]) return;

    setSaving((prev) => ({ ...prev, [key]: true }));

    const { yearMonth, daysInMonth } = getMonthMeta();
    const dateStr = `${yearMonth}-${String(dayNum).padStart(2, '0')}`;
    const currentDay = logs[dayNum] ?? { webdev: false, jog: false };
    const newValue = !currentDay[field];
    const updatedDay = { ...currentDay, [field]: newValue };
    const updatedLogs = { ...logs, [dayNum]: updatedDay };

    setLogs(updatedLogs);
    calculateAndReportStreaks(updatedLogs, daysInMonth);

    try {
      const { data, error: selectError } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('date', dateStr);
      if (selectError) throw selectError;

      if (data && data.length > 0) {
        const { error: updateError } = await supabase
          .from('daily_logs')
          .update({ [field === 'webdev' ? 'webdev_completed' : 'jog_completed']: newValue })
          .eq('id', data[0].id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('daily_logs').insert({
          user_id: userId,
          date: dateStr,
          webdev_completed: field === 'webdev' ? newValue : false,
          jog_completed: field === 'jog' ? newValue : false,
        });
        if (insertError) throw insertError;
      }

      if ((field === 'webdev' && newValue && updatedDay.jog) || (field === 'jog' && newValue && updatedDay.webdev)) {
        onPerfectDay(dayNum);
      }
      onLogChange?.();
    } catch (err) {
      console.error('Failed to save log toggle:', err);
      const revertedLogs = { ...logs, [dayNum]: currentDay };
      setLogs(revertedLogs);
      calculateAndReportStreaks(revertedLogs, daysInMonth);
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const { daysInMonth } = getMonthMeta();

  return (
    <div className="p-5 bg-system-card border border-system-border rounded-lg space-y-4 font-sans">
      <div className="text-xs text-system-cyan tracking-[0.15em] font-mono uppercase font-bold text-center border-b border-system-border/40 pb-2.5">
        [ MONTHLY TRAINING LOG - ATTENDANCE TRACKER ]
      </div>

      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
          const day = logs[dayNum] ?? { webdev: false, jog: false };
          const isPerfect = day.webdev && day.jog;

          return (
            <div
              key={dayNum}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-system-panel border rounded transition-all duration-300 ${
                isPerfect
                  ? 'border-system-cyanGlow/50 shadow-[0_0_6px_rgba(59,130,246,0.15)] bg-cyan-950/5'
                  : 'border-system-border/60 hover:border-system-border'
              }`}
            >
              <div className="text-xs font-mono font-bold tracking-wider text-system-textMuted uppercase">
                DAY {String(dayNum).padStart(2, '0')}
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => handleToggle(dayNum, 'webdev')}
                  disabled={saving[`${dayNum}-webdev`]}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded border text-[10px] sm:text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-60 ${
                    day.webdev
                      ? 'bg-cyan-500/10 border-system-cyan text-system-cyan'
                      : 'bg-system-bg border-system-border text-system-muted hover:border-system-cyan/50 hover:text-system-textMuted'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 border rounded flex items-center justify-center text-[8px] transition-all ${
                      day.webdev ? 'border-system-cyan bg-system-cyan text-system-dark' : 'border-system-border'
                    }`}
                  >
                    {day.webdev && <Check strokeWidth={3} className="w-2.5 h-2.5" />}
                  </div>
                  <span>WEB DEV</span>
                </button>

                <button
                  onClick={() => handleToggle(dayNum, 'jog')}
                  disabled={saving[`${dayNum}-jog`]}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded border text-[10px] sm:text-xs font-bold tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-60 ${
                    day.jog
                      ? 'bg-emerald-500/10 border-emerald-500/80 text-emerald-400'
                      : 'bg-system-bg border-system-border text-system-muted hover:border-emerald-500/50 hover:text-system-textMuted'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 border rounded flex items-center justify-center text-[8px] transition-all ${
                      day.jog ? 'border-emerald-500 bg-emerald-400 text-system-dark' : 'border-system-border'
                    }`}
                  >
                    {day.jog && <Check strokeWidth={3} className="w-2.5 h-2.5" />}
                  </div>
                  <span>DAILY JOG</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
