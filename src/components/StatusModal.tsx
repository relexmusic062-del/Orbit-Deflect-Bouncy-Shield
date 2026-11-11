import React from 'react';
import { GameMode } from '../game/catalog';

export interface RunSummarySnapshot {
  outcome: 'victory' | 'defeat';
  gameMode: GameMode;
  score: number;
  bestScore: number;
  levelReached: number;
  coinsEarned: number;
  deflections: number;
  bankKills: number;
}

interface StatusModalProps {
  mode: 'paused' | 'gameover';
  summary: RunSummarySnapshot;
  onResume: () => void;
  onRestart: () => void;
  onNextLevel: () => void;
  onOpenShop: () => void;
  onReturnTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  mode,
  summary,
  onResume,
  onRestart,
  onNextLevel,
  onOpenShop,
  onReturnTitle,
}) => {
  const isVictory = mode === 'gameover' && summary.outcome === 'victory';

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-6 pointer-events-auto"
      style={{ backgroundColor: 'rgba(7, 10, 16, 0.84)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
      <div className="w-full max-w-md bg-[#0F172A] border border-amber-500/40 rounded-xl p-7 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1 border-b border-slate-800 pb-4">
          <div className="text-xs font-mono uppercase tracking-widest text-amber-400">
            {mode === 'paused'
              ? 'GAME PAUSED'
              : isVictory
                ? `LEVEL ${Math.round(summary.levelReached)} COMPLETE`
                : 'GAME OVER'}
          </div>
          <h2
            id="status-modal-title"
            className="text-3xl font-display font-extrabold text-slate-50 tracking-tight"
          >
            {mode === 'paused'
              ? 'Game Paused'
              : isVictory
                ? 'Level Cleared!'
                : 'Shield Breached'}
          </h2>
        </div>

        {/* 3 Tabular Stat Tiles */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0B0F17] border border-slate-800/90 rounded-lg p-3 flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              SCORE
            </span>
            <span className="text-xl font-display font-extrabold text-slate-100 tabular-nums">
              {Math.round(summary.score)}
            </span>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              Best {Math.round(summary.bestScore)}
            </span>
          </div>

          <div className="bg-[#0B0F17] border border-slate-800/90 rounded-lg p-3 flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              LEVEL
            </span>
            <span className="text-xl font-display font-extrabold text-amber-400 tabular-nums">
              Level {Math.round(summary.levelReached)}
            </span>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {summary.gameMode === 'level' ? 'Of 100' : 'Infinity'}
            </span>
          </div>

          <div className="bg-[#0B0F17] border border-slate-800/90 rounded-lg p-3 flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              COINS EARNED
            </span>
            <span className="text-xl font-display font-extrabold text-emerald-400 tabular-nums">
              +{Math.round(summary.coinsEarned)}
            </span>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {Math.round(summary.deflections)} Deflects
            </span>
          </div>
        </div>

        {/* Primary & Secondary Actions */}
        <div className="flex flex-col gap-2.5 pt-1">
          {mode === 'paused' ? (
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onResume();
                }}
                className="w-full sm:flex-1 py-3 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base transition-colors cursor-pointer whitespace-nowrap"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenShop();
                }}
                className="w-full sm:w-auto py-3 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Shop
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onReturnTitle();
                }}
                className="w-full sm:w-auto py-3 px-4 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Menu
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              {isVictory && summary.gameMode === 'level' && summary.levelReached < 100 ? (
                <button
                  type="button"
                  data-start="true"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onNextLevel();
                  }}
                  className="w-full sm:flex-1 py-3.5 px-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-base transition-colors cursor-pointer whitespace-nowrap"
                >
                  Next Level ({summary.levelReached + 1})
                </button>
              ) : (
                <button
                  type="button"
                  data-start="true"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onRestart();
                  }}
                  className="w-full sm:flex-1 py-3.5 px-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-base transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isVictory ? 'Play Again' : 'Try Again'}
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenShop();
                }}
                className="w-full sm:w-auto py-3.5 px-5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Shop
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onReturnTitle();
                }}
                className="w-full sm:w-auto py-3.5 px-5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                Menu
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
