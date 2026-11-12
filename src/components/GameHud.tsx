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
  enemiesDefeated: number;
  totalEnemiesInLevel: number;
  enemiesRemaining: number;
  deflections: number;
  pulseCooldown: number;
  dualShieldTimer: number;
  tripleWeaponTimer: number;
  fullAegisTimer: number;
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
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-start p-2 sm:p-4">
      {/* Top Row: Left Vitality & Level Enemy Counter | Right Score, Coins & Utility Cluster */}
      <div className="flex items-start justify-between gap-1.5 sm:gap-3 w-full">
        {/* Top-Left Perimeter Cluster: Vitality Sockets + Level & Enemy Kill Count */}
        <div className="flex items-center gap-2 sm:gap-3.5 bg-[#0B1220]/75 backdrop-blur-xs border border-amber-500/30 rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 shadow-lg">
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] sm:text-[10px] font-mono uppercase tracking-widest text-amber-200/80">
              LIFE
            </span>
            <div className="flex items-center gap-0.5 sm:gap-1" aria-label={`Health ${hud.hp} of ${hud.maxHp}`}>
              {Array.from({ length: hud.maxHp }).map((_, idx) => {
                const isFull = idx < hud.hp;
                const isCracked = idx === hud.hp && hud.crackedSocketIndex === idx;
                return (
                  <svg
                    key={idx}
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 sm:w-5 sm:h-5 overflow-visible"
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

          <div className="h-6 sm:h-7 w-px bg-slate-700/80" />

          <div className="flex flex-col">
            <span className="text-[8px] sm:text-[10px] font-mono uppercase tracking-widest text-amber-200/80">
              {hud.gameMode === 'level' ? `LEVEL ${Math.round(hud.level)}` : `INFINITY LVL ${Math.round(hud.level)}`}
            </span>
            {hud.gameMode === 'level' ? (
              <div className="flex items-center gap-1.5" data-testid="hud-enemy-progress">
                <span className="text-xs sm:text-sm font-display font-extrabold text-emerald-400 tabular-nums leading-none">
                  Killed {Math.round(hud.enemiesDefeated)}/{Math.round(hud.totalEnemiesInLevel)}
                </span>
                <span className="hidden sm:inline text-[10px] font-mono text-slate-300 tabular-nums">
                  ({Math.round(hud.enemiesRemaining)} left)
                </span>
              </div>
            ) : (
              <span className="text-xs sm:text-sm font-display font-extrabold text-emerald-400 leading-none">
                Endless Wave
              </span>
            )}
          </div>
        </div>

        {/* Top-Right Perimeter Cluster: Coins, Score & Utility Controls */}
        <div className="flex items-center gap-1 sm:gap-2.5">
          <div className="flex items-center gap-2 sm:gap-3.5 bg-[#0B1220]/75 backdrop-blur-xs border border-amber-500/30 rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 shadow-lg">
            <div className="flex flex-col items-end">
              <span className="text-[8px] sm:text-[10px] font-mono uppercase tracking-widest text-amber-300/80">
                COINS
              </span>
              <span
                data-testid="hud-coins"
                className="text-sm sm:text-lg font-display font-extrabold text-amber-400 tabular-nums stroke-numeral leading-none"
              >
                {Math.round(hud.coins).toLocaleString()}
              </span>
            </div>

            <div className="h-5 sm:h-6 w-px bg-slate-700/80" />

            <div className="flex flex-col items-end">
              <span className="text-[8px] sm:text-[10px] font-mono uppercase tracking-widest text-amber-200/80">
                SCORE
              </span>
              <span
                data-testid="hud-score"
                className="text-sm sm:text-xl font-display font-extrabold text-slate-50 tabular-nums stroke-numeral leading-none"
              >
                {Math.round(hud.score)}
              </span>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-1">
            <button
              type="button"
              tabIndex={-1}
              aria-label={hud.muted ? 'Unmute Audio [M]' : 'Mute Audio [M]'}
              title="Mute / Unmute [M]"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-[#0B1220]/75 border border-slate-600/80 hover:border-amber-400 flex items-center justify-center text-slate-200 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2">
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
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-[#0B1220]/75 border border-slate-600/80 hover:border-amber-400 flex items-center justify-center text-slate-200 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor">
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
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-[#0B1220]/75 border border-slate-600/80 hover:border-amber-400 flex items-center justify-center text-slate-200 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" strokeLinecap="round" />
                <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Upper-Left Semi-Transparent Gift Skill Countdown Dock (Directly below Top Bar, NEVER in center!) */}
      <div className="mt-2 flex flex-col items-start gap-1.5">
        {hud.dualShieldTimer > 0 && (
          <div className="bg-slate-950/45 backdrop-blur-xs border border-emerald-400/45 rounded-lg px-2.5 py-1.5 flex items-center gap-2 w-40 sm:w-48">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 28 28" className="w-4 h-4">
                <path d="M6 9 A10 10 0 0 1 22 9" fill="none" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M22 19 A10 10 0 0 1 6 19" fill="none" stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="14" cy="14" r="3" fill="#A7F3D0" />
              </svg>
            </div>
            <div className="flex-1 flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
                <span className="text-emerald-300/95">Dual Shield</span>
                <span className="font-mono text-white/90 tabular-nums">
                  {hud.dualShieldTimer.toFixed(1)}s
                </span>
              </div>
              <div className="w-full h-1 bg-slate-800/70 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400/90"
                  style={{
                    width: `${Math.min(100, (hud.dualShieldTimer / 12) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {hud.tripleWeaponTimer > 0 && (
          <div className="bg-slate-950/45 backdrop-blur-xs border border-sky-400/45 rounded-lg px-2.5 py-1.5 flex items-center gap-2 w-40 sm:w-48">
            <div className="w-6 h-6 rounded-md bg-sky-500/20 border border-sky-400/40 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 28 28" className="w-4 h-4">
                <path d="M14 22 L14 6 M14 22 L6 8 M14 22 L22 8" stroke="#38BDF8" strokeWidth="2.8" strokeLinecap="round" />
                <circle cx="14" cy="5" r="2.2" fill="#E0F2FE" />
                <circle cx="6" cy="7" r="2.2" fill="#E0F2FE" />
                <circle cx="22" cy="7" r="2.2" fill="#E0F2FE" />
              </svg>
            </div>
            <div className="flex-1 flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
                <span className="text-sky-300/95">Triple Shot</span>
                <span className="font-mono text-white/90 tabular-nums">
                  {hud.tripleWeaponTimer.toFixed(1)}s
                </span>
              </div>
              <div className="w-full h-1 bg-slate-800/70 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400/90"
                  style={{
                    width: `${Math.min(100, (hud.tripleWeaponTimer / 10) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {hud.fullAegisTimer > 0 && (
          <div className="bg-slate-950/45 backdrop-blur-xs border border-amber-400/45 rounded-lg px-2.5 py-1.5 flex items-center gap-2 w-40 sm:w-48">
            <div className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 28 28" className="w-4 h-4">
                <circle cx="14" cy="14" r="9" fill="none" stroke="#F59E0B" strokeWidth="3.5" />
                <circle cx="14" cy="14" r="3" fill="#FEF3C7" />
              </svg>
            </div>
            <div className="flex-1 flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
                <span className="text-amber-300/95">360° Shield</span>
                <span className="font-mono text-white/90 tabular-nums">
                  {hud.fullAegisTimer.toFixed(1)}s
                </span>
              </div>
              <div className="w-full h-1 bg-slate-800/70 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400/90"
                  style={{
                    width: `${Math.min(100, (hud.fullAegisTimer / 10) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
