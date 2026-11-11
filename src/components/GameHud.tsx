import React from 'react';
import { GameMode } from '../game/catalog';
import { ShieldStanceId } from '../game/physics';

export interface HudSnapshot {
  gameMode: GameMode;
  hp: number;
  maxHp: number;
  crackedSocketIndex: number;
  score: number;
  bestScore: number;
  coins: number;
  combo: number;
  level: number;
  enemiesRemaining: number;
  deflections: number;
  pulseCooldown: number;
  dualShieldTimer: number;
  tripleWeaponTimer: number;
  stance: ShieldStanceId;
  muted: boolean;
}

interface GameHudProps {
  hud: HudSnapshot;
  onSelectStance: (stance: ShieldStanceId) => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  onToggleMute,
  onTogglePause,
  onRestart,
}) => {
  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 md:p-6">
      {/* Top Row: Left Vitality & Level Cluster | Right Score, Coins & Utility Cluster */}
      <div className="flex items-start justify-between gap-4 w-full">
        {/* Top-Left Perimeter Cluster: Vitality Sockets + Level Progress */}
        <div className="flex items-center gap-5 bg-[#0F172A]/88 border border-amber-500/25 rounded-lg px-4 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
          {/* Code-Authored SVG Vitality Shield Sockets (3 States: Full, Cracked, Hollow) */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-200/70">
              LIFE
            </span>
            <div className="flex items-center gap-1.5" aria-label={`Health ${hud.hp} of ${hud.maxHp}`}>
              {Array.from({ length: hud.maxHp }).map((_, idx) => {
                const isFull = idx < hud.hp;
                const isCracked = idx === hud.hp && hud.crackedSocketIndex === idx;
                return (
                  <svg
                    key={idx}
                    viewBox="0 0 24 24"
                    className="w-6 h-6 overflow-visible"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 2L4 5.5V11.5C4 16.8 7.4 21.6 12 23C16.6 21.6 20 16.8 20 11.5V5.5L12 2Z"
                      fill="#070A10"
                      stroke="#1E293B"
                      strokeWidth="2"
                    />
                    {isFull ? (
                      <>
                        <path
                          d="M12 3.5L5.5 6.4V11.4C5.5 15.8 8.3 19.8 12 21.1C15.7 19.8 18.5 15.8 18.5 11.4V6.4L12 3.5Z"
                          fill="#10B981"
                          stroke="#A7F3D0"
                          strokeWidth="1.2"
                        />
                        <path
                          d="M12 5.5L7.5 7.6V11.2C7.5 13.8 9.2 16.5 12 17.8"
                          fill="none"
                          stroke="#ECFDF5"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                      </>
                    ) : isCracked ? (
                      <>
                        <path
                          d="M12 3.5L5.5 6.4V11.4C5.5 15.8 8.3 19.8 12 21.1C15.7 19.8 18.5 15.8 18.5 11.4V6.4L12 3.5Z"
                          fill="#7F1D1D"
                          stroke="#F87171"
                          strokeWidth="1.2"
                        />
                        <path
                          d="M9 6L13 11L10 14L14 19"
                          fill="none"
                          stroke="#FCA5A5"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </>
                    ) : (
                      <path
                        d="M12 4.2L6.2 6.8V11.3C6.2 15.2 8.7 18.8 12 20C15.3 18.8 17.8 15.2 17.8 11.3V6.8L12 4.2Z"
                        fill="#0F172A"
                        stroke="#334155"
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                      />
                    )}
                  </svg>
                );
              })}
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          {/* Level / Infinity Mode Readout */}
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-200/70">
              {hud.gameMode === 'level' ? 'LEVEL' : 'INFINITY LEVEL'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-extrabold text-amber-400 tabular-nums stroke-numeral leading-none">
                {Math.round(hud.level)}
              </span>
              {hud.gameMode === 'level' ? (
                <span className="text-xs font-mono text-slate-400 tabular-nums">
                  · {Math.round(hud.enemiesRemaining)} left
                </span>
              ) : (
                <span className="text-xs font-mono text-emerald-400">· Endless</span>
              )}
            </div>
          </div>
        </div>

        {/* Top-Right Perimeter Cluster: Coins, Score & Utility Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-5 bg-[#0F172A]/88 border border-amber-500/25 rounded-lg px-4 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300/80">
                COINS
              </span>
              <span
                data-testid="hud-coins"
                className="text-xl font-display font-extrabold text-amber-400 tabular-nums stroke-numeral leading-none"
              >
                {Math.round(hud.coins)}
              </span>
            </div>

            <div className="h-7 w-px bg-slate-800" />

            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-200/70">
                SCORE
              </span>
              <span
                data-testid="hud-score"
                className="text-2xl md:text-3xl font-display font-extrabold text-slate-50 tabular-nums stroke-numeral leading-none"
              >
                {Math.round(hud.score)}
              </span>
            </div>
          </div>

          {/* Top-Right Utility SVG Buttons: Mute [M], Pause [P], Restart [R] */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              tabIndex={-1}
              aria-label={hud.muted ? 'Unmute Audio [M]' : 'Mute Audio [M]'}
              title="Mute / Unmute [M]"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="w-10 h-10 rounded-lg bg-[#0F172A]/90 border border-slate-700/80 hover:border-amber-400/70 flex items-center justify-center text-slate-200 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                {hud.muted ? (
                  <>
                    <path d="M11 5L6 9H2v6h4l5 4V5z" fill="#1E293B" />
                    <line x1="23" y1="9" x2="17" y2="15" stroke="#F87171" />
                    <line x1="17" y1="9" x2="23" y2="15" stroke="#F87171" />
                  </>
                ) : (
                  <>
                    <path d="M11 5L6 9H2v6h4l5 4V5z" fill="#1E293B" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="#F59E0B" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="#F59E0B" />
                  </>
                )}
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Pause Game [P]"
              title="Pause Game [P]"
              onClick={(e) => {
                e.currentTarget.blur();
                onTogglePause();
              }}
              className="w-10 h-10 rounded-lg bg-[#0F172A]/90 border border-slate-700/80 hover:border-amber-400/70 flex items-center justify-center text-slate-200 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Restart Run [R]"
              title="Restart Run [R]"
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              className="w-10 h-10 rounded-lg bg-[#0F172A]/90 border border-slate-700/80 hover:border-amber-400/70 flex items-center justify-center text-slate-200 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeLinecap="round" />
                <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Active Infinity Gift Buffs (only shown when active) */}
      <div className="flex items-center justify-center gap-4">
        {hud.dualShieldTimer > 0 && (
          <div className="bg-[#0F172A]/90 border border-emerald-400/60 rounded-lg px-3.5 py-1.5 font-mono text-xs text-emerald-300 tabular-nums">
            DUAL SHIELD · {hud.dualShieldTimer.toFixed(1)}s
          </div>
        )}
        {hud.tripleWeaponTimer > 0 && (
          <div className="bg-[#0F172A]/90 border border-sky-400/60 rounded-lg px-3.5 py-1.5 font-mono text-xs text-sky-300 tabular-nums">
            TRIPLE RICOCHET · {hud.tripleWeaponTimer.toFixed(1)}s
          </div>
        )}
      </div>
    </div>
  );
};
