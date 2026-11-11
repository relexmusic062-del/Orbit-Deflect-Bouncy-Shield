import React from 'react';
import { GameMode } from '../game/catalog';

interface TitleOverlayProps {
  gameMode: GameMode;
  selectedLevel: number;
  highestUnlockedLevel: number;
  coins: number;
  bestScore: number;
  onSelectMode: (mode: GameMode) => void;
  onSelectLevel: (level: number) => void;
  onOpenShop: () => void;
  onStartGame: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  gameMode,
  selectedLevel,
  highestUnlockedLevel,
  coins,
  bestScore,
  onSelectMode,
  onSelectLevel,
  onOpenShop,
  onStartGame,
}) => {
  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 md:p-10"
      style={{
        background:
          'linear-gradient(90deg, rgba(7, 10, 16, 0.94) 0%, rgba(7, 10, 16, 0.80) 28%, rgba(7, 10, 16, 0.18) 44%, rgba(7, 10, 16, 0.0) 55%)',
      }}
    >
      {/* Top Row: Coins & Shop Button */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <div className="flex items-center gap-3 text-xs font-mono text-slate-300 tabular-nums">
          <span className="text-amber-400 font-bold">{Math.round(coins)} COINS</span>
          {bestScore > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>BEST {Math.round(bestScore)}</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenShop}
          className="px-4 py-2 rounded-lg bg-[#0F172A] border border-amber-500/50 hover:border-amber-400 text-amber-300 font-display font-bold text-sm transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4 fill-amber-400">
            <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Shop & Skins</span>
        </button>
      </div>

      {/* Left-Third Clean Lockup & Mode Selection */}
      <div className="pointer-events-auto max-w-md my-auto flex flex-col items-start gap-6">
        <svg
          viewBox="0 0 440 108"
          className="w-full max-w-[400px] h-auto overflow-visible"
          role="img"
          aria-label="Orbit Deflect: Bouncy Shield"
        >
          <defs>
            <linearGradient id="brassCrestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>

          <g transform="translate(46, 54)">
            <circle
              cx="0"
              cy="0"
              r="38"
              fill="#0F172A"
              stroke="#475569"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
            <circle cx="0" cy="0" r="20" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="9" fill="#38BDF8" />
            <path
              d="M 24 -29 A 38 38 0 0 1 24 29"
              fill="none"
              stroke="url(#brassCrestGrad)"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>

          <g transform="translate(102, 16)">
            <text
              x="0"
              y="34"
              fill="#F8FAFC"
              fontFamily="Outfit, sans-serif"
              fontWeight="800"
              fontSize="36"
              letterSpacing="1.2"
            >
              ORBIT DEFLECT
            </text>
            <rect x="2" y="45" width="310" height="2" fill="#334155" />
            <text
              x="2"
              y="72"
              fill="url(#brassCrestGrad)"
              fontFamily="Outfit, sans-serif"
              fontWeight="700"
              fontSize="20"
              letterSpacing="3"
            >
              BOUNCY SHIELD
            </text>
          </g>
        </svg>

        {/* Mode Switcher: Level Mode (100 Levels) vs Infinity Mode */}
        <div className="w-full flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5 w-full">
            <button
              type="button"
              onClick={() => onSelectMode('level')}
              className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                gameMode === 'level'
                  ? 'bg-[#1E293B] border-amber-400 text-slate-50'
                  : 'bg-[#0F172A]/90 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-sm font-display font-bold">Level Mode</div>
              <div className="text-xs font-mono text-amber-400 mt-0.5 tabular-nums">
                Level {selectedLevel} / 100
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectMode('infinity')}
              className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                gameMode === 'infinity'
                  ? 'bg-[#1E293B] border-emerald-400 text-slate-50'
                  : 'bg-[#0F172A]/90 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-sm font-display font-bold">Infinity Mode</div>
              <div className="text-xs font-mono text-emerald-400 mt-0.5">
                Endless + Gift Drops
              </div>
            </button>
          </div>

          {/* Level Selector Stepper when in Level Mode */}
          {gameMode === 'level' && (
            <div className="flex items-center justify-between bg-[#0F172A]/90 border border-slate-800 rounded-lg px-3.5 py-2">
              <span className="text-xs font-mono text-slate-300 tabular-nums">
                Select Level (Unlocked: {highestUnlockedLevel}/100)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={selectedLevel <= 1}
                  onClick={() => onSelectLevel(Math.max(1, selectedLevel - 1))}
                  aria-label="Previous Level"
                  className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-mono font-bold text-sm cursor-pointer"
                >
                  -
                </button>
                <span className="text-sm font-mono font-bold text-amber-400 w-10 text-center tabular-nums">
                  {selectedLevel}
                </span>
                <button
                  type="button"
                  disabled={selectedLevel >= highestUnlockedLevel}
                  onClick={() =>
                    onSelectLevel(Math.min(highestUnlockedLevel, selectedLevel + 1))
                  }
                  aria-label="Next Unlocked Level"
                  className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-mono font-bold text-sm cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Primary Play Action + Quick Shop Button */}
        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartGame();
            }}
            className="flex-1 py-4 px-7 rounded-lg bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 text-slate-950 font-display font-extrabold text-lg tracking-wide transition-all duration-150 shadow-[0_4px_20px_rgba(245,158,11,0.35)] cursor-pointer whitespace-nowrap"
          >
            {gameMode === 'level' ? `Start Level ${selectedLevel}` : 'Start Infinity Run'}
          </button>
        </div>
      </div>

      {/* Empty bottom spacer to preserve clean framing with zero text clutter */}
      <div />
    </div>
  );
};
