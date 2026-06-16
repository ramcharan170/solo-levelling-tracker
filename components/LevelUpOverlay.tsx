'use client';

import React, { useEffect } from 'react';

interface LevelUpOverlayProps {
  levelUpActive: boolean;
  perfectDayActive: boolean;
  levelUpRankTitle: string;
  perfectDayNum: number;
  onCloseLevelUp: () => void;
  onClosePerfectDay: () => void;
}

export default function LevelUpOverlay({
  levelUpActive,
  perfectDayActive,
  levelUpRankTitle,
  perfectDayNum,
  onCloseLevelUp,
  onClosePerfectDay,
}: LevelUpOverlayProps) {
  useEffect(() => {
    if (!levelUpActive) return;
    const timer = setTimeout(() => {
      onCloseLevelUp();
    }, 2500);
    return () => clearTimeout(timer);
  }, [levelUpActive, onCloseLevelUp]);

  useEffect(() => {
    if (!perfectDayActive) return;
    const timer = setTimeout(() => {
      onClosePerfectDay();
    }, 2800);
    return () => clearTimeout(timer);
  }, [perfectDayActive, onClosePerfectDay]);

  return (
    <>
      <div
        className={`fixed top-8 left-1/2 -translate-x-1/2 z-[999] px-8 py-4 bg-system-card border-2 border-system-cyan rounded-lg text-center shadow-cyan glow-cyan level-up-pulse transition-all duration-500 ease-out font-sans ${
          levelUpActive ? 'translate-y-0 opacity-100' : '-translate-y-28 opacity-0 pointer-events-none'
        }`}
      >
        <div className="text-system-cyan text-sm tracking-[0.3em] font-black uppercase font-mono">
          LEVEL UP
        </div>
        <div className="text-system-textMuted text-[10px] tracking-wider mt-1 uppercase font-semibold font-mono">
          {levelUpRankTitle}
        </div>
      </div>

      <div
        className={`fixed inset-0 z-[1000] bg-system-bg/80 flex items-center justify-center transition-all duration-500 ease-in-out font-sans p-4 ${
          perfectDayActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`bg-system-card border-2 border-system-cyan rounded-xl p-8 max-w-sm w-full text-center shadow-cyan glow-cyan transition-all duration-500 transform ${
            perfectDayActive ? 'scale-100' : 'scale-90'
          }`}
        >
          <div className="text-[10px] text-system-muted font-mono tracking-[0.25em] uppercase font-bold mb-2">
            [ System Notification ]
          </div>
          <h2 className="text-system-cyan text-xl sm:text-2xl font-black tracking-[0.15em] uppercase drop-shadow-[0_0_8px_rgba(125,211,252,0.4)]">
            Daily Quest Cleared
          </h2>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-system-border to-transparent my-4 rank-up-flare" />

          <p className="text-xs sm:text-sm text-system-textMuted leading-relaxed tracking-wide font-mono">
            Day {perfectDayNum} - Web dev session and jog completed.
            <br />
            <span className="block text-[11px] text-system-cyan mt-2 animate-pulse">
              A perfect day. The system acknowledges your discipline.
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
