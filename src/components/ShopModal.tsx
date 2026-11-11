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
  const [activeTab, setActiveTab] = useState<ShopTab>('characters');

  const renderPreviewIcon = (tab: ShopTab, item: SkinItem<string>) => {
    if (tab === 'characters') {
      if (item.id === 'agent') {
        return (
          <svg viewBox="0 0 48 48" className="w-12 h-12">
            <circle cx="24" cy="24" r="18" fill="#0F172A" stroke="#475569" strokeWidth="2.5" />
            {/* White shirt & red/black tie */}
            <path d="M18 34 L24 26 L30 34 Z" fill="#F8FAFC" />
            <path d="M23 28 L25 28 L25.5 36 L22.5 36 Z" fill="#EF4444" />
            {/* Cool black sunglasses */}
            <rect x="13" y="17" width="10" height="6" rx="1.5" fill="#020617" stroke="#94A3B8" strokeWidth="1" />
            <rect x="25" y="17" width="10" height="6" rx="1.5" fill="#020617" stroke="#94A3B8" strokeWidth="1" />
            <line x1="23" y1="19" x2="25" y2="19" stroke="#94A3B8" strokeWidth="1.5" />
          </svg>
        );
      }
      if (item.id === 'monk') {
        return (
          <svg viewBox="0 0 48 48" className="w-12 h-12">
            <circle cx="24" cy="24" r="19" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="24" cy="24" r="15" fill="#78350F" stroke="#F59E0B" strokeWidth="2" />
            {/* Red headband */}
            <path d="M10 19 Q24 15 38 19" fill="none" stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round" />
            {/* Serene closed eyes */}
            <path d="M16 24 Q19 26 22 24" fill="none" stroke="#FEF3C7" strokeWidth="2" strokeLinecap="round" />
            <path d="M26 24 Q29 26 32 24" fill="none" stroke="#FEF3C7" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      }
      if (item.id === 'wizard') {
        return (
          <svg viewBox="0 0 48 48" className="w-12 h-12">
            <circle cx="24" cy="27" r="14" fill="#3B0764" stroke="#A855F7" strokeWidth="2" />
            {/* Wizard pointed hat */}
            <path d="M10 22 L24 5 L38 22 Z" fill="#581C87" stroke="#C084FC" strokeWidth="2" />
            <ellipse cx="24" cy="22" rx="16" ry="4" fill="#6B21A8" stroke="#C084FC" strokeWidth="1.5" />
            {/* Glowing eyes */}
            <circle cx="19" cy="28" r="2.2" fill="#FDE047" />
            <circle cx="29" cy="28" r="2.2" fill="#FDE047" />
          </svg>
        );
      }
      if (item.id === 'astronaut') {
        return (
          <svg viewBox="0 0 48 48" className="w-12 h-12">
            <circle cx="24" cy="24" r="17" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="2.5" />
            {/* Gold Reflective Visor */}
            <rect x="13" y="15" width="22" height="16" rx="8" fill="#F59E0B" stroke="#78350F" strokeWidth="2" />
            <path d="M16 19 Q22 17 28 19" fill="none" stroke="#FEF3C7" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 48 48" className="w-12 h-12">
          {/* DJ with Headphones & Turntable */}
          <path d="M9 24 A15 15 0 0 1 39 24" fill="none" stroke="#38BDF8" strokeWidth="3.5" />
          <rect x="6" y="20" width="5" height="10" rx="2.5" fill="#EC4899" />
          <rect x="37" y="20" width="5" height="10" rx="2.5" fill="#EC4899" />
          <circle cx="24" cy="25" r="13" fill="#0F172A" stroke="#EC4899" strokeWidth="2" />
          <circle cx="24" cy="25" r="5" fill="#38BDF8" />
        </svg>
      );
    }

    if (tab === 'shields') {
      if (item.id === 'pan') {
        return (
          <svg viewBox="0 0 48 48" className="w-12 h-12">
            {/* Cast Iron Frying Pan */}
            <line x1="24" y1="32" x2="24" y2="45" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
            <circle cx="24" cy="20" r="13" fill="#1E293B" stroke="#64748B" strokeWidth="3" />
            <circle cx="24" cy="20" r="9" fill="#0F172A" stroke="#475569" strokeWidth="1" />
          </svg>
        );
      }
      if (item.id === 'lightsaber') {
        return (
          <svg viewBox="0 0 48 48" className="w-12 h-12">
            {/* Glowing Laser Sword */}
            <path d="M10 34 Q24 12 38 34" fill="none" stroke="#10B981" strokeWidth="8" strokeLinecap="round" opacity="0.4" />
            <path d="M10 34 Q24 12 38 34" fill="none" stroke="#ECFDF5" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        );
      }
      if (item.id === 'donut') {
        return (
          <svg viewBox="0 0 48 48" className="w-12 h-12">
            {/* Giant Pink Frosted Donut Arc */}
            <path d="M9 32 A16 16 0 0 1 39 32" fill="none" stroke="#FBBF24" strokeWidth="10" strokeLinecap="round" />
            <path d="M9 32 A16 16 0 0 1 39 32" fill="none" stroke="#F472B6" strokeWidth="7" strokeLinecap="round" />
            <circle cx="17" cy="20" r="1.5" fill="#38BDF8" />
            <circle cx="24" cy="17" r="1.5" fill="#FDE047" />
            <circle cx="31" cy="20" r="1.5" fill="#4ADE80" />
          </svg>
        );
      }
      if (item.id === 'vinyl') {
        return (
          <svg viewBox="0 0 48 48" className="w-12 h-12">
            <circle cx="24" cy="24" r="15" fill="#090D16" stroke="#334155" strokeWidth="2" />
            <circle cx="24" cy="24" r="10" fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="4 2" />
            <circle cx="24" cy="24" r="5" fill="#F43F5E" />
            <circle cx="24" cy="24" r="1.8" fill="#090D16" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 48 48" className="w-12 h-12">
          <path
            d="M10 32 A16 16 0 0 1 38 32"
            fill="none"
            stroke={item.primaryColor}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M14 29 A13 13 0 0 1 34 29"
            fill="none"
            stroke={item.accentColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );
    }

    if (tab === 'projectiles') {
      if (item.id === 'shuriken') {
        return (
          <svg viewBox="0 0 48 48" className="w-12 h-12">
            <path
              d="M24 7 L28 20 L41 24 L28 28 L24 41 L20 28 L7 24 L20 20 Z"
              fill="#38BDF8"
              stroke="#F8FAFC"
              strokeWidth="1.5"
            />
            <circle cx="24" cy="24" r="3" fill="#0F172A" />
          </svg>
        );
      }
      if (item.id === 'arrow') {
        return (
          <svg viewBox="0 0 48 48" className="w-12 h-12">
            <line x1="10" y1="36" x2="35" y2="13" stroke="#FDE047" strokeWidth="3" />
            <path d="M38 10 L28 13 L35 20 Z" fill="#EA580C" />
            <circle cx="35" cy="13" r="5" fill="#F97316" opacity="0.5" />
          </svg>
        );
      }
      if (item.id === 'tomato') {
        return (
          <svg viewBox="0 0 48 48" className="w-12 h-12">
            <circle cx="24" cy="26" r="12" fill="#EF4444" stroke="#B91C1C" strokeWidth="2" />
            <path d="M19 14 L24 17 L29 14 L24 12 Z" fill="#22C55E" stroke="#15803D" strokeWidth="1.5" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 48 48" className="w-12 h-12">
          <line x1="12" y1="34" x2="34" y2="14" stroke={item.primaryColor} strokeWidth="5" strokeLinecap="round" />
          <circle cx="34" cy="14" r="5" fill={item.accentColor} />
        </svg>
      );
    }

    // Trails
    return (
      <svg viewBox="0 0 48 48" className="w-12 h-12">
        <path
          d="M10 34 Q24 10 38 30"
          fill="none"
          stroke={item.primaryColor}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M14 34 Q24 16 38 30"
          fill="none"
          stroke={item.accentColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 md:p-6 pointer-events-auto"
      style={{ backgroundColor: 'rgba(7, 10, 16, 0.88)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-modal-title"
    >
      <div className="w-full max-w-3xl bg-[#0F172A] border border-slate-700/80 rounded-xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.85)] flex flex-col gap-5 max-h-[88vh]">
        {/* Header Row */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <h2
              id="shop-modal-title"
              className="text-2xl font-display font-extrabold text-slate-50 tracking-tight"
            >
              Armory & Skins Shop
            </h2>
            <div className="flex items-center gap-1.5 bg-[#0B0F17] border border-amber-500/40 rounded-lg px-3 py-1">
              <svg viewBox="0 0 20 20" className="w-4 h-4 fill-amber-400">
                <circle cx="10" cy="10" r="8" />
              </svg>
              <span
                data-testid="shop-coins"
                className="font-mono font-bold text-amber-400 text-sm tabular-nums"
              >
                {Math.round(profile.coins)} Coins
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Shop"
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0B0F17] rounded-lg border border-slate-800">
          {(
            [
              { id: 'characters', label: 'Characters (5)' },
              { id: 'shields', label: 'Shields / Dhaal (6)' },
              { id: 'projectiles', label: 'Projectiles (5)' },
              { id: 'trails', label: 'Shield Trails (4)' },
            ] as { id: ShopTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Grid of Skins */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-1">
          {activeTab === 'characters' &&
            CHARACTER_SKINS.map((item) => {
              const unlocked = profile.unlockedCharacters.includes(item.id);
              const equipped = profile.loadout.character === item.id;
              const canAfford = profile.coins >= item.price;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border flex flex-col items-center text-center gap-2.5 ${
                    equipped
                      ? 'bg-[#1E293B] border-amber-400'
                      : 'bg-[#0B0F17] border-slate-800'
                  }`}
                >
                  {renderPreviewIcon('characters', item)}
                  <div>
                    <div className="text-sm font-bold text-slate-100">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.subtitle}</div>
                  </div>
                  <button
                    type="button"
                    disabled={!unlocked && !canAfford}
                    onClick={() => onBuyOrEquipCharacter(item.id, item.price)}
                    className={`w-full py-2 px-3 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      equipped
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : unlocked
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                          : canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {equipped
                      ? 'Equipped'
                      : unlocked
                        ? 'Equip'
                        : `Buy · ${item.price} Coins`}
                  </button>
                </div>
              );
            })}

          {activeTab === 'shields' &&
            SHIELD_SKINS.map((item) => {
              const unlocked = profile.unlockedShields.includes(item.id);
              const equipped = profile.loadout.shield === item.id;
              const canAfford = profile.coins >= item.price;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border flex flex-col items-center text-center gap-2.5 ${
                    equipped
                      ? 'bg-[#1E293B] border-amber-400'
                      : 'bg-[#0B0F17] border-slate-800'
                  }`}
                >
                  {renderPreviewIcon('shields', item)}
                  <div>
                    <div className="text-sm font-bold text-slate-100">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.subtitle}</div>
                  </div>
                  <button
                    type="button"
                    disabled={!unlocked && !canAfford}
                    onClick={() => onBuyOrEquipShield(item.id, item.price)}
                    className={`w-full py-2 px-3 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      equipped
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : unlocked
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                          : canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {equipped
                      ? 'Equipped'
                      : unlocked
                        ? 'Equip'
                        : `Buy · ${item.price} Coins`}
                  </button>
                </div>
              );
            })}

          {activeTab === 'projectiles' &&
            PROJECTILE_SKINS.map((item) => {
              const unlocked = profile.unlockedProjectiles.includes(item.id);
              const equipped = profile.loadout.projectile === item.id;
              const canAfford = profile.coins >= item.price;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border flex flex-col items-center text-center gap-2.5 ${
                    equipped
                      ? 'bg-[#1E293B] border-amber-400'
                      : 'bg-[#0B0F17] border-slate-800'
                  }`}
                >
                  {renderPreviewIcon('projectiles', item)}
                  <div>
                    <div className="text-sm font-bold text-slate-100">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.subtitle}</div>
                  </div>
                  <button
                    type="button"
                    disabled={!unlocked && !canAfford}
                    onClick={() => onBuyOrEquipProjectile(item.id, item.price)}
                    className={`w-full py-2 px-3 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      equipped
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : unlocked
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                          : canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {equipped
                      ? 'Equipped'
                      : unlocked
                        ? 'Equip'
                        : `Buy · ${item.price} Coins`}
                  </button>
                </div>
              );
            })}

          {activeTab === 'trails' &&
            TRAIL_SKINS.map((item) => {
              const unlocked = profile.unlockedTrails.includes(item.id);
              const equipped = profile.loadout.trail === item.id;
              const canAfford = profile.coins >= item.price;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border flex flex-col items-center text-center gap-2.5 ${
                    equipped
                      ? 'bg-[#1E293B] border-amber-400'
                      : 'bg-[#0B0F17] border-slate-800'
                  }`}
                >
                  {renderPreviewIcon('trails', item)}
                  <div>
                    <div className="text-sm font-bold text-slate-100">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.subtitle}</div>
                  </div>
                  <button
                    type="button"
                    disabled={!unlocked && !canAfford}
                    onClick={() => onBuyOrEquipTrail(item.id, item.price)}
                    className={`w-full py-2 px-3 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      equipped
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : unlocked
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                          : canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {equipped
                      ? 'Equipped'
                      : unlocked
                        ? 'Equip'
                        : `Buy · ${item.price} Coins`}
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
