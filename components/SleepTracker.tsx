'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Moon, Terminal } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getSleepXpBonus } from '@/lib/gameplay';

interface SleepTrackerProps {
  userId: string;
  onXpChange: (xpAdded: number) => void;
  onSleepLogged?: () => void;
}

export default function SleepTracker({ userId, onXpChange, onSleepLogged }: SleepTrackerProps) {
  const [hours, setHours] = useState<number>(7);
  const [todayLog, setTodayLog] = useState<{ hours: number; xp_bonus: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const getTodayDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const fetchTodaySleepLog = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sleep_logs')
      .select('hours, xp_bonus')
      .eq('user_id', userId)
      .eq('date', getTodayDateString());

    if (error) {
      console.error("Error fetching today's sleep log:", error);
    } else if (data && data.length > 0) {
      setTodayLog({ hours: Number(data[0].hours), xp_bonus: data[0].xp_bonus });
    } else {
      setTodayLog(null);
    }
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchTodaySleepLog();
  }, [fetchTodaySleepLog]);

  const handleLogSleep = async () => {
    if (saving || todayLog) return;
    setSaving(true);

    const xp_bonus = getSleepXpBonus(hours);

    try {
      const { error: insertError } = await supabase.from('sleep_logs').insert({
        user_id: userId,
        date: getTodayDateString(),
        hours,
        xp_bonus,
      });
      if (insertError) throw insertError;

      const { data: profile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', userId)
        .single();
      if (profileFetchError) throw profileFetchError;

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ xp: (profile?.xp ?? 0) + xp_bonus })
        .eq('id', userId);
      if (profileUpdateError) throw profileUpdateError;

      setTodayLog({ hours, xp_bonus });
      onXpChange(xp_bonus);
      onSleepLogged?.();
    } catch (err) {
      console.error('Failed to log sleep:', err);
    } finally {
      setSaving(false);
    }
  };

  const getRecoveryText = (h: number) => {
    if (h >= 7) return 'FULL RECOVERY';
    if (h >= 5) return 'PARTIAL RECOVERY';
    return 'INSUFFICIENT RECOVERY';
  };

  const getRecoveryColor = (h: number) => {
    if (h >= 7) return 'text-cyan-400';
    if (h >= 5) return 'text-purpleGlow';
    return 'text-red-400';
  };

  return (
    <div className="p-5 bg-system-card border border-system-border rounded-lg space-y-4 font-sans">
      <div className="text-xs text-system-cyan tracking-[0.15em] font-mono uppercase font-bold text-center border-b border-system-border/40 pb-2.5">
        [ DAILY SLEEP LOG - RECOVERY CHAMBER ]
      </div>

      {loading ? (
        <div className="text-center py-4 text-[10px] text-system-muted font-mono animate-pulse">
          SYNCHRONIZING RECOVERY STATUS...
        </div>
      ) : todayLog ? (
        <div className="bg-system-panel border border-cyan-500/30 rounded p-4 text-center space-y-2.5">
          <Moon className="w-8 h-8 text-cyan-400 mx-auto animate-pulse" />
          <div className="text-xs font-mono font-bold text-cyan-400 tracking-wider">
            [ TODAY&apos;S RECOVERY RECORDED ]
          </div>
          <div className="text-xs text-system-text font-bold">Logged {todayLog.hours.toFixed(0)} Hours</div>
          <div className="flex justify-center items-center gap-1.5 text-[10px] text-system-muted font-mono">
            <Check size={12} className="text-cyan-400" />
            <span>Bonus Awarded: +{todayLog.xp_bonus} XP ({getRecoveryText(todayLog.hours)})</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-baseline text-xs font-mono">
              <span className="text-system-muted font-bold">SLEEP DURATION</span>
              <span className="text-system-text font-black text-sm">{hours} hrs</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[4, 5, 6, 7, 8, 9].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHours(h)}
                  className={`py-1.5 text-xs font-mono font-bold border rounded cursor-pointer transition-all ${
                    hours === h
                      ? 'border-system-cyan bg-cyan-500/10 text-system-cyan shadow-cyan/15 shadow-sm'
                      : 'border-system-border bg-system-panel text-system-muted hover:border-system-cyan/50 hover:text-system-textMuted'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          <div className="bg-system-panel border border-system-border/60 rounded p-3 text-center text-xs">
            <div className="text-system-muted text-[10px] tracking-wider uppercase font-bold mb-1">Estimated State</div>
            <div className={`font-bold font-mono tracking-wide ${getRecoveryColor(hours)}`}>
              {getRecoveryText(hours)}
            </div>
            <div className="text-[10px] text-system-cyan font-mono font-bold mt-1">+{getSleepXpBonus(hours)} XP BONUS</div>
          </div>

          <button
            onClick={handleLogSleep}
            disabled={saving}
            className="w-full py-2.5 bg-system-panel hover:bg-system-cyanGlow/10 border border-system-border hover:border-system-cyan text-xs tracking-widest text-system-cyan font-bold font-mono rounded flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
          >
            <Terminal size={14} className="text-system-cyan" />
            {saving ? 'RECORDING...' : 'RECORD RECOVERY CYCLE'}
          </button>
        </div>
      )}
    </div>
  );
}
