import React from 'react';
import {
  CHARACTER_SKINS,
  CharacterSkinId,
  GameMode,
  SHIELD_SKINS,
  ShieldSkinId,
} from '../game/catalog';
import { soundEngine } from '../game/audio';

interface TitleOverlayProps {
  gameMode: GameMode;
  highestUnlockedLevel: number;
  equippedCharacter: CharacterSkinId;
  equippedShield: ShieldSkinId;
  coins: number;
  bestScore: number;
  muted: boolean;
  onToggleMute: () => void;
  onSelectMode: (mode: GameMode) => void;
  onOpenShop: () => void;
  onStartGame: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  gameMode,
  highestUnlockedLevel,
  equippedCharacter,
  equippedShield,
  coins,
  bestScore,
  muted,
  onToggleMute,
  onSelectMode,
  onOpenShop,
  onStartGame,
}) => {
  const shieldInfo = SHIELD_SKINS.find((s) => s.id === equippedShield) ?? SHIELD_SKINS[0];
  const charInfo = CHARACTER_SKINS.find((c) => c.id === equippedCharacter) ?? CHARACTER_SKINS[0];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3.5 sm:p-6 md:p-8">
      {/* Top Bar: Game Title on Left | Coins, Audio Toggle & Shop Button on Right */}
      <div className="flex items-center justify-between gap-2 w-full pointer-events-auto">
        <div className="flex flex-col bg-[#0F172A]/90 border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-lg shrink-0">
          <span className="text-sm sm:text-xl md:text-2xl font-display font-extrabold tracking-tight text-amber-400 stroke-numeral leading-none whitespace-nowrap">
            ORBIT DEFLECT
          </span>
          <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-300 tracking-wider mt-0.5 whitespace-nowrap">
            BOUNCY SHIELD
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Coin Vault Badge */}
          <div className="flex items-center gap-1.5 bg-[#0F172A]/92 border border-amber-500/40 rounded-xl px-2.5 sm:px-3.5 py-2 text-xs font-mono tabular-nums shadow-md">
            <svg viewBox="0 0 20 20" className="w-4 h-4 fill-amber-400 shrink-0">
              <circle cx="10" cy="10" r="8" />
            </svg>
            <span className="text-amber-400 font-bold">{Math.round(coins).toLocaleString()}</span>
            {bestScore > 0 && (
              <span className="hidden md:inline text-slate-300 ml-1">
                | BEST {Math.round(bestScore)}
              </span>
            )}
          </div>

          {/* Sound Toggle Button */}
          <button
            type="button"
            aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
            onClick={() => {
              onToggleMute();
              soundEngine.playUiClick();
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0F172A]/92 border border-slate-700/80 hover:border-amber-400 flex items-center justify-center text-slate-100 transition-all cursor-pointer shrink-0 shadow-md"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2">
              {muted ? (
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

          {/* Shop Button */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenShop();
            }}
            className="px-3 sm:px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 border-b-4 border-amber-700 active:translate-y-0.5 text-slate-950 font-display font-extrabold text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-lg"
          >
            <svg viewBox="0 0 20 20" className="w-4 h-4 fill-slate-950">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Shop</span>
          </button>
        </div>
      </div>

      {/* Center Viewport stays 100% open for the Character & Orbiting Shield */}
      <div className="my-auto" />

      {/* Directly Below the Character & Shield: Equipped Info + Mode Switcher + Play Button */}
      <div className="pointer-events-auto mx-auto w-full max-w-sm flex flex-col items-center gap-2.5 pb-2 sm:pb-4">
        <div className="px-3.5 py-1 rounded-full bg-[#0F172A]/90 border border-slate-700/80 shadow-md flex items-center gap-2">
          <span className="text-[11px] sm:text-xs font-display font-bold text-slate-100">
            {charInfo.name}
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-300">
            {shieldInfo.name} ({shieldInfo.safetyDegrees}°)
          </span>
        </div>

        {/* Mode Switcher: Current Highest Level vs Infinity Mode */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#0F172A]/95 border border-slate-700/90 rounded-2xl w-full shadow-lg">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onSelectMode('level');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-display font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              gameMode === 'level'
                ? 'bg-amber-500 text-slate-950 border-b-4 border-amber-700 shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Level Mode · Lvl {highestUnlockedLevel}
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onSelectMode('infinity');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-display font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              gameMode === 'infinity'
                ? 'bg-emerald-500 text-slate-950 border-b-4 border-emerald-700 shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Infinity Mode
          </button>
        </div>

        {/* Primary Play Button Directly Under Character & Shield */}
        <button
          type="button"
          data-start="true"
          onClick={(e) => {
            e.currentTarget.blur();
            soundEngine.playStartGame();
            onStartGame();
          }}
          className="w-full py-3.5 sm:py-4 px-8 rounded-2xl bg-amber-500 hover:bg-amber-400 border-b-4 border-amber-700 active:translate-y-0.5 text-slate-950 font-display font-extrabold text-lg sm:text-xl tracking-wide transition-all duration-150 shadow-[0_8px_24px_rgba(245,158,11,0.45)] cursor-pointer whitespace-nowrap"
        >
          {gameMode === 'level' ? `Play Level ${highestUnlockedLevel}` : 'Play Infinity'}
        </button>
      </div>
    </div>
  );
};
