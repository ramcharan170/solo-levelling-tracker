'use client';

import { Award } from 'lucide-react';
import type { AchievementRecord } from '@/lib/achievements';

interface AchievementToastProps {
  achievement: AchievementRecord | null;
}

export default function AchievementToast({ achievement }: AchievementToastProps) {
  return (
    <div
      className={`fixed right-4 top-20 z-[1001] w-[calc(100vw-2rem)] max-w-sm border border-amber-400/70 bg-system-card px-4 py-3 rounded-lg shadow-[0_0_20px_rgba(251,191,36,0.28)] transition-all duration-500 achievement-pop ${
        achievement ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded border border-amber-400/60 bg-amber-500/10 flex items-center justify-center shrink-0">
          <Award className="w-5 h-5 text-amber-300" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-mono tracking-[0.2em] text-amber-300 uppercase font-bold">
            Achievement Unlocked
          </div>
          <div className="text-sm font-black text-system-text truncate">{achievement?.title ?? 'Achievement'}</div>
          <div className="text-xs text-system-textMuted leading-relaxed">{achievement?.description ?? ''}</div>
        </div>
      </div>
    </div>
  );
}
