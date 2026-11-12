import React, { useState } from 'react';
import {
  CHARACTER_SKINS,
  CharacterSkinId,
  PROJECTILE_SKINS,
  ProjectileSkinId,
  SHIELD_SKINS,
  ShieldSkinId,
  SkinItem,
  TRAIL_SKINS,
  TrailSkinId,
  UnlockedStoreState,
} from '../game/catalog';
import { soundEngine } from '../game/audio';

type ShopTab = 'characters' | 'shields' | 'projectiles' | 'trails';

interface ShopModalProps {
  profile: UnlockedStoreState;
  onBuyOrEquipCharacter: (id: CharacterSkinId, price: number) => void;
  onBuyOrEquipShield: (id: ShieldSkinId, price: number) => void;
  onBuyOrEquipProjectile: (id: ProjectileSkinId, price: number) => void;
  onBuyOrEquipTrail: (id: TrailSkinId, price: number) => void;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  profile,
  onBuyOrEquipCharacter,
  onBuyOrEquipShield,
  onBuyOrEquipProjectile,
  onBuyOrEquipTrail,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ShopTab>('shields');

  const renderPreviewIcon = (tab: ShopTab, item: SkinItem<string>) => {
    const gradId = `grad-${tab}-${item.id}`;
    const pedGradId = `ped-${tab}-${item.id}`;

    if (tab === 'characters') {
      if (item.id === 'agent') {
        return (
          <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20">
            <defs>
              <radialGradient id={gradId} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="60%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>
              <linearGradient id={pedGradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0F172A" />
              </linearGradient>
            </defs>
            <ellipse cx="32" cy="56" rx="22" ry="6" fill="rgba(0,0,0,0.65)" />
            <ellipse cx="32" cy="53" rx="20" ry="5.5" fill="#090D16" stroke="#334155" strokeWidth="1.5" />
            <ellipse cx="32" cy="50" rx="19" ry="5" fill={`url(#${pedGradId})`} stroke="#38BDF8" strokeWidth="1.2" />
            <path d="M16 49 C16 34 48 34 48 49 Z" fill={`url(#${gradId})`} stroke="#64748B" strokeWidth="1.5" />
            <path d="M26 36 L32 48 L38 36 Z" fill="#F8FAFC" />
            <path d="M30.5 38 L33.5 38 L34 49 L30 49 Z" fill="#EF4444" />
            <circle cx="32" cy="24" r="12" fill="#FDE68A" stroke="#475569" strokeWidth="1.5" />
            <path d="M20 20 Q32 10 44 20 L42 14 Q32 8 22 14 Z" fill="#0F172A" />
            <rect x="21" y="20" width="10" height="6" rx="2" fill="#020617" stroke="#38BDF8" strokeWidth="1.2" />
            <rect x="33" y="20" width="10" height="6" rx="2" fill="#020617" stroke="#38BDF8" strokeWidth="1.2" />
            <line x1="31" y1="22" x2="33" y2="22" stroke="#E2E8F0" strokeWidth="1.5" />
          </svg>
        );
      }
      if (item.id === 'monk') {
        return (
          <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20">
            <defs>
              <radialGradient id={gradId} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="65%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#78350F" />
              </radialGradient>
            </defs>
            <ellipse cx="32" cy="56" rx="22" ry="6" fill="rgba(0,0,0,0.65)" />
            <ellipse cx="32" cy="50" rx="19" ry="5" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
            <line x1="15" y1="44" x2="48" y2="14" stroke="#E2E8F0" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M16 49 C17 34 47 34 48 49 Z" fill={`url(#${gradId})`} stroke="#FDE047" strokeWidth="1.5" />
            <circle cx="32" cy="24" r="12" fill="#FDE68A" stroke="#B45309" strokeWidth="1.5" />
            <path d="M19 19 Q32 14 45 19" fill="none" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
            <circle cx="27" cy="24" r="2" fill="#0F172A" />
            <circle cx="37" cy="24" r="2" fill="#0F172A" />
          </svg>
        );
      }
      if (item.id === 'wizard') {
        return (
          <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20">
            <defs>
              <radialGradient id={gradId} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#A855F7" />
                <stop offset="70%" stopColor="#581C87" />
                <stop offset="100%" stopColor="#2E1065" />
              </radialGradient>
            </defs>
            <ellipse cx="32" cy="56" rx="22" ry="6" fill="rgba(168,85,247,0.45)" />
            <ellipse cx="32" cy="50" rx="19" ry="5" fill="#2E1065" stroke="#C084FC" strokeWidth="1.5" />
            <path d="M15 48 C17 33 47 33 49 48 Z" fill={`url(#${gradId})`} stroke="#D8B4FE" strokeWidth="1.5" />
            <circle cx="32" cy="27" r="10.5" fill="#3B0764" stroke="#C084FC" strokeWidth="1.5" />
            <path d="M14 22 L32 4 L50 22 Z" fill={`url(#${gradId})`} stroke="#E9D5FF" strokeWidth="1.5" />
            <ellipse cx="32" cy="22" rx="18" ry="4" fill="#6B21A8" stroke="#E9D5FF" strokeWidth="1.2" />
            <circle cx="28" cy="27" r="2.3" fill="#FDE047" />
            <circle cx="36" cy="27" r="2.3" fill="#FDE047" />
          </svg>
        );
      }
      if (item.id === 'astronaut') {
        return (
          <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20">
            <defs>
              <radialGradient id={gradId} cx="30%" cy="25%" r="70%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="65%" stopColor="#CBD5E1" />
                <stop offset="100%" stopColor="#475569" />
              </radialGradient>
            </defs>
            <ellipse cx="32" cy="56" rx="22" ry="6" fill="rgba(0,0,0,0.65)" />
            <ellipse cx="32" cy="50" rx="19" ry="5" fill="#1E293B" stroke="#FBBF24" strokeWidth="1.5" />
            <path d="M14 49 C15 33 49 33 50 49 Z" fill={`url(#${gradId})`} stroke="#94A3B8" strokeWidth="1.8" />
            <circle cx="32" cy="24" r="13.5" fill={`url(#${gradId})`} stroke="#64748B" strokeWidth="2" />
            <rect x="20" y="16" width="24" height="15" rx="7" fill="#F59E0B" stroke="#78350F" strokeWidth="1.8" />
            <path d="M24 20 Q32 17 40 20" fill="none" stroke="#FEF3C7" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20">
          <ellipse cx="32" cy="56" rx="22" ry="6" fill="rgba(236,72,153,0.4)" />
          <ellipse cx="32" cy="50" rx="19" ry="5" fill="#0F172A" stroke="#EC4899" strokeWidth="1.5" />
          <path d="M15 49 C16 34 48 34 49 49 Z" fill="#1E1B4B" stroke="#38BDF8" strokeWidth="1.8" />
          <path d="M16 25 A16 16 0 0 1 48 25" fill="none" stroke="#38BDF8" strokeWidth="3.5" />
          <rect x="13" y="20" width="6" height="12" rx="3" fill="#EC4899" />
          <rect x="45" y="20" width="6" height="12" rx="3" fill="#EC4899" />
          <circle cx="32" cy="25" r="11.5" fill="#0F172A" stroke="#EC4899" strokeWidth="1.8" />
          <rect x="23" y="21" width="18" height="6" rx="3" fill="#38BDF8" />
        </svg>
      );
    }

    if (tab === 'shields') {
      const deg = item.safetyDegrees ?? 90;
      const rad = (deg * Math.PI) / 180;
      const half = rad / 2;
      const cx = 32;
      const cy = 28;
      const r = 16;
      const startAngle = -Math.PI / 2 - half;
      const endAngle = -Math.PI / 2 + half;
      const x1 = cx + Math.cos(startAngle) * r;
      const y1 = cy + Math.sin(startAngle) * r;
      const x2 = cx + Math.cos(endAngle) * r;
      const y2 = cy + Math.sin(endAngle) * r;
      const largeArc = deg > 180 ? 1 : 0;

      return (
        <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20">
          <ellipse cx="32" cy="56" rx="22" ry="5.5" fill="rgba(0,0,0,0.65)" />
          <ellipse cx="32" cy="52" rx="19" ry="4.5" fill="#0F172A" stroke={item.primaryColor} strokeWidth="1.4" />
          <circle cx={cx} cy={cy} r="5" fill="#334155" stroke="#94A3B8" strokeWidth="1.2" />

          {deg >= 360 ? (
            <>
              <circle cx={cx} cy={cy + 4} r={r} fill="none" stroke="rgba(0,0,0,0.65)" strokeWidth="9" />
              <circle cx={cx} cy={cy + 2} r={r} fill="none" stroke="#78350F" strokeWidth="9" />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#FBBF24" strokeWidth="8.5" />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F472B6" strokeWidth="5.5" />
              <circle cx={cx} cy={cy - r} r="1.8" fill="#38BDF8" />
              <circle cx={cx + r} cy={cy} r="1.8" fill="#FDE047" />
              <circle cx={cx} cy={cy + r} r="1.8" fill="#4ADE80" />
              <circle cx={cx - r} cy={cy} r="1.8" fill="#A855F7" />
            </>
          ) : (
            <>
              <path
                d={`M ${x1} ${y1 + 5} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2 + 5}`}
                fill="none"
                stroke="rgba(0,0,0,0.65)"
                strokeWidth="9.5"
                strokeLinecap="round"
              />
              <path
                d={`M ${x1} ${y1 + 2.5} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2 + 2.5}`}
                fill="none"
                stroke="#020617"
                strokeWidth="9.5"
                strokeLinecap="round"
              />
              <path
                d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
                fill="none"
                stroke={item.primaryColor}
                strokeWidth="8.5"
                strokeLinecap="round"
              />
              <path
                d={`M ${x1} ${y1 - 1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2 - 1}`}
                fill="none"
                stroke={item.accentColor}
                strokeWidth="3"
                strokeLinecap="round"
              />
            </>
          )}
        </svg>
      );
    }

    if (tab === 'projectiles') {
      if (item.id === 'shuriken') {
        return (
          <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20">
            <ellipse cx="32" cy="55" rx="20" ry="5" fill="rgba(0,0,0,0.6)" />
            <path
              d="M32 10 L37 26 L53 31 L37 36 L32 52 L27 36 L11 31 L27 26 Z"
              fill="#0284C7"
            />
            <path
              d="M32 7 L37 23 L53 28 L37 33 L32 49 L27 33 L11 28 L27 23 Z"
              fill="#38BDF8"
              stroke="#F8FAFC"
              strokeWidth="1.5"
            />
            <circle cx="32" cy="28" r="4" fill="#0F172A" stroke="#E0F2FE" strokeWidth="1.5" />
          </svg>
        );
      }
      if (item.id === 'arrow') {
        return (
          <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20">
            <ellipse cx="32" cy="55" rx="20" ry="5" fill="rgba(234,88,12,0.45)" />
            <line x1="14" y1="44" x2="44" y2="16" stroke="#9A3412" strokeWidth="5" strokeLinecap="round" />
            <line x1="14" y1="42" x2="44" y2="14" stroke="#FDE047" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M50 9 L36 14 L45 23 Z" fill="#EA580C" stroke="#FDE047" strokeWidth="1.2" />
            <circle cx="44" cy="15" r="7" fill="#F97316" opacity="0.45" />
          </svg>
        );
      }
      if (item.id === 'tomato') {
        return (
          <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20">
            <ellipse cx="32" cy="55" rx="20" ry="5" fill="rgba(239,68,68,0.4)" />
            <circle cx="32" cy="33" r="15" fill="#991B1B" />
            <circle cx="32" cy="30" r="15" fill="#EF4444" stroke="#FCA5A5" strokeWidth="1.5" />
            <ellipse cx="26" cy="24" rx="4" ry="2.5" fill="#FECACA" opacity="0.7" />
            <path d="M24 15 L32 19 L40 15 L32 12 Z" fill="#22C55E" stroke="#15803D" strokeWidth="1.5" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20">
          <ellipse cx="32" cy="55" rx="20" ry="5" fill="rgba(0,0,0,0.6)" />
          <line x1="16" y1="42" x2="44" y2="18" stroke="rgba(0,0,0,0.5)" strokeWidth="8" strokeLinecap="round" />
          <line x1="16" y1="39" x2="44" y2="15" stroke={item.primaryColor} strokeWidth="7" strokeLinecap="round" />
          <circle cx="44" cy="15" r="6.5" fill={item.accentColor} stroke={item.primaryColor} strokeWidth="2" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20">
        <ellipse cx="32" cy="55" rx="20" ry="5" fill="rgba(0,0,0,0.6)" />
        <path
          d="M12 42 Q32 10 52 36"
          fill="none"
          stroke="rgba(0,0,0,0.55)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M12 38 Q32 6 52 32"
          fill="none"
          stroke={item.primaryColor}
          strokeWidth="7.5"
          strokeLinecap="round"
        />
        <path
          d="M16 38 Q32 12 52 32"
          fill="none"
          stroke={item.accentColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  const renderCard = (
    tab: ShopTab,
    item: SkinItem<string>,
    unlocked: boolean,
    equipped: boolean,
    onAction: () => void
  ) => {
    const canAfford = profile.coins >= item.price;

    return (
      <div
        key={item.id}
        className={`p-3 sm:p-4 rounded-2xl border-2 flex flex-col items-center text-center gap-2 transition-all ${
          equipped
            ? 'bg-gradient-to-b from-[#1E293B] to-[#0F172A] border-amber-400 shadow-[0_8px_0_#78350F,0_12px_28px_rgba(245,158,11,0.28)] -translate-y-0.5'
            : 'bg-gradient-to-b from-[#111827] to-[#0B0F17] border-slate-700/90 shadow-[0_6px_0_#020617,0_10px_20px_rgba(0,0,0,0.65)] hover:border-slate-500'
        }`}
      >
        {/* 1. Logo / Preview Stage */}
        <div className="relative w-full py-1.5 rounded-xl bg-gradient-to-b from-[#1E293B]/80 to-[#090D16] border border-slate-700/70 flex flex-col items-center justify-center shadow-inner">
          {item.safetyDegrees && (
            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[10px] font-mono font-bold text-amber-300">
              {item.safetyDegrees}°
            </span>
          )}
          {renderPreviewIcon(tab, item)}
        </div>

        {/* Product Name ONLY (no small subtitle/description below it) */}
        <div className="text-xs sm:text-sm font-display font-extrabold text-slate-50 leading-tight">
          {item.name}
        </div>

        {/* 2. Coin Price directly below the Logo/Name */}
        <div className="flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg bg-[#070A10] border border-amber-500/30 w-full">
          <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-amber-400 shrink-0">
            <circle cx="10" cy="10" r="8" />
          </svg>
          <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
            {item.price === 0 ? 'Free' : `${item.price.toLocaleString()} Coins`}
          </span>
        </div>

        {/* 3. Buy / Equip Button directly below the Coin Price */}
        <button
          type="button"
          disabled={!unlocked && !canAfford}
          onClick={() => {
            soundEngine.playUiClick();
            onAction();
          }}
          className={`w-full py-2 px-3 rounded-xl text-xs font-display font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            equipped
              ? 'bg-emerald-500 text-slate-950 border-b-4 border-emerald-700 shadow-md'
              : unlocked
                ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 border-b-4 border-sky-700 active:translate-y-0.5'
                : canAfford
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-b-4 border-amber-700 active:translate-y-0.5 shadow-[0_4px_14px_rgba(245,158,11,0.35)]'
                  : 'bg-slate-800/80 text-slate-500 border-b-4 border-slate-950 cursor-not-allowed'
          }`}
        >
          {equipped ? 'Equipped' : unlocked ? 'Equip' : 'Buy'}
        </button>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-6 pointer-events-auto"
      style={{ backgroundColor: 'rgba(5, 9, 18, 0.88)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-modal-title"
    >
      <div className="w-full max-w-3xl bg-gradient-to-b from-[#162238] to-[#0B111E] border-2 border-slate-600/80 rounded-2xl p-3.5 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.9)] flex flex-col gap-3.5 sm:gap-5 max-h-[92vh]">
        {/* Header Row */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <h2
              id="shop-modal-title"
              className="text-lg sm:text-2xl font-display font-extrabold text-slate-50 tracking-tight"
            >
              Shop
            </h2>
            <div className="flex items-center gap-1.5 bg-[#070B14] border border-amber-500/50 rounded-xl px-2.5 sm:px-3.5 py-1 shadow-inner">
              <svg viewBox="0 0 20 20" className="w-4 h-4 fill-amber-400 shrink-0">
                <circle cx="10" cy="10" r="8" />
              </svg>
              <span
                data-testid="shop-coins"
                className="font-mono font-bold text-amber-400 text-xs sm:text-sm tabular-nums"
              >
                {Math.round(profile.coins).toLocaleString()} Coins
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            aria-label="Close Shop"
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border-b-4 border-slate-950 text-slate-100 text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5 p-1 bg-[#070B14] rounded-xl border border-slate-800">
          {(
            [
              { id: 'shields', label: 'Shields' },
              { id: 'characters', label: 'Heroes' },
              { id: 'projectiles', label: 'Ammo' },
              { id: 'trails', label: 'Trails' },
            ] as { id: ShopTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setActiveTab(t.id);
              }}
              className={`py-2 px-1.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-display font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-amber-500 text-slate-950 border-b-2 border-amber-700 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Grid of Skins */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 overflow-y-auto pr-1 pb-2">
          {activeTab === 'shields' &&
            SHIELD_SKINS.map((item) =>
              renderCard(
                'shields',
                item,
                profile.unlockedShields.includes(item.id),
                profile.loadout.shield === item.id,
                () => onBuyOrEquipShield(item.id, item.price)
              )
            )}

          {activeTab === 'characters' &&
            CHARACTER_SKINS.map((item) =>
              renderCard(
                'characters',
                item,
                profile.unlockedCharacters.includes(item.id),
                profile.loadout.character === item.id,
                () => onBuyOrEquipCharacter(item.id, item.price)
              )
            )}

          {activeTab === 'projectiles' &&
            PROJECTILE_SKINS.map((item) =>
              renderCard(
                'projectiles',
                item,
                profile.unlockedProjectiles.includes(item.id),
                profile.loadout.projectile === item.id,
                () => onBuyOrEquipProjectile(item.id, item.price)
              )
            )}

          {activeTab === 'trails' &&
            TRAIL_SKINS.map((item) =>
              renderCard(
                'trails',
                item,
                profile.unlockedTrails.includes(item.id),
                profile.loadout.trail === item.id,
                () => onBuyOrEquipTrail(item.id, item.price)
              )
            )}
        </div>
      </div>
    </div>
  );
};
