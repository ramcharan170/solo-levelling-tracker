'use client';

import React from 'react';
import { User } from 'lucide-react';
import { getRankDetails, calculateLevelInfo } from '@/lib/gameplay';

interface RankHeaderProps {
  xp: number;
  username: string | null;
  webdevStreak: number;
  jogStreak: number;
  perfectDays: number;
}

export default function RankHeader({
  xp,
  username,
  webdevStreak,
  jogStreak,
  perfectDays,
}: RankHeaderProps) {
  const { level, currentXp, xpNeededForNext, percent } = calculateLevelInfo(xp);
  const rank = getRankDetails(level);

  return (
    <div className="space-y-6 font-sans">
      {/* HEADER LOGO PANEL */}
      <div className="relative text-center py-6 px-4 bg-system-card border border-system-border rounded-lg overflow-hidden shadow-cyan/10 shadow-md">
        {/* Top Scanline Pulse */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-system-cyan to-transparent animate-pulse" />
        <div className="text-[10px] text-system-muted tracking-[0.3em] uppercase mb-1 font-mono">
          [ System Notification ]
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-[0.2em] text-system-cyan uppercase drop-shadow-[0_0_8px_rgba(125,211,252,0.3)]">
          Monthly Quest Log
        </h1>
        <p className="text-xs text-system-textMuted mt-1 tracking-wider">
          A new path to power has been unlocked. Complete all quests to ascend.
        </p>
      </div>

      {/* RANK & PROGRESS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Rank Badge Panel */}
        <div className="md:col-span-2 p-5 bg-system-card border border-system-border rounded-lg flex items-center gap-5 relative overflow-hidden">
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 border-2 rounded flex items-center justify-center font-mono font-black text-3xl sm:text-4xl transition-all duration-500 shrink-0 ${rank.themeClass} ${rank.shadowClass}`}
          >
            {rank.letter}
          </div>
          <div className="space-y-1">
            <div className={`text-sm sm:text-base font-black tracking-widest uppercase ${rank.themeClass.split(' ')[0]}`}>
              {rank.title}
            </div>
            <div className="text-xs text-system-textMuted leading-relaxed">
              {rank.desc}
            </div>
            <div className="pt-1 flex items-center gap-2 text-[10px] text-system-muted font-mono tracking-wider">
              <User size={12} className="text-system-cyan" />
              <span>HUNTER ID: {username ?? 'UNKNOWN'}</span>
            </div>
          </div>
        </div>

        {/* Streaks Panel */}
        <div className="grid grid-cols-3 md:grid-cols-1 md:divide-y md:divide-system-border/50 border border-system-border rounded-lg bg-system-card overflow-hidden text-center">
          <div className="py-3 px-2 flex flex-col justify-center">
            <div className="text-lg sm:text-xl font-mono font-black text-system-cyan drop-shadow-[0_0_5px_rgba(125,211,252,0.2)]">
              {webdevStreak}
            </div>
            <div className="text-[9px] sm:text-[10px] tracking-wider text-system-muted uppercase font-bold mt-0.5">
              DEV STREAK
            </div>
          </div>
          <div className="py-3 px-2 flex flex-col justify-center">
            <div className="text-lg sm:text-xl font-mono font-black text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.2)]">
              {jogStreak}
            </div>
            <div className="text-[9px] sm:text-[10px] tracking-wider text-system-muted uppercase font-bold mt-0.5">
              JOG STREAK
            </div>
          </div>
          <div className="py-3 px-2 flex flex-col justify-center">
            <div className="text-lg sm:text-xl font-mono font-black text-system-purpleGlow drop-shadow-[0_0_5px_rgba(167,139,250,0.2)]">
              {perfectDays}
            </div>
            <div className="text-[9px] sm:text-[10px] tracking-wider text-system-muted uppercase font-bold mt-0.5">
              PERFECT DAYS
            </div>
          </div>
        </div>
      </div>

      {/* OVERALL LEVEL PROGRESS BAR */}
      <div className="p-5 bg-system-card border border-system-border rounded-lg space-y-3">
        <div className="flex justify-between items-baseline text-xs font-mono">
          <span className="text-system-cyan tracking-wider font-bold">OVERALL HUNTER PROGRESS</span>
          <span className="text-system-text font-bold">LEVEL {level}</span>
        </div>
        
        {/* Outer Bar */}
        <div className="h-4 bg-system-panel border border-system-border rounded overflow-hidden relative">
          {/* Inner Fill */}
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-system-cyanGlow to-system-cyan shadow-[0_0_10px_rgba(125,211,252,0.5)] transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-system-muted font-mono tracking-wider">
          <span>XP: {currentXp} / {xpNeededForNext} ({percent}%)</span>
          <span>{percent === 100 ? 'MAX LEVEL REACHED' : `${100 - percent}% TO NEXT LEVEL`}</span>
        </div>
      </div>
    </div>
  );
}
