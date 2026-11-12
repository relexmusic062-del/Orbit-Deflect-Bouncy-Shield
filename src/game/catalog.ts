export type CharacterSkinId = 'agent' | 'monk' | 'wizard' | 'astronaut' | 'dj';
export type ShieldSkinId = 'iron' | 'pan' | 'lightsaber' | 'rune' | 'vinyl' | 'donut';
export type ProjectileSkinId = 'bullet' | 'arrow' | 'shuriken' | 'laser' | 'tomato';
export type TrailSkinId = 'silver' | 'red' | 'blue' | 'rainbow';

export type GameMode = 'level' | 'infinity';

export interface SkinItem<T extends string> {
  id: T;
  name: string;
  price: number;
  primaryColor: string;
  accentColor: string;
  safetyDegrees?: number; // For shields: 90, 120, 180, 220, 270, 360
}

export const CHARACTER_SKINS: SkinItem<CharacterSkinId>[] = [
  {
    id: 'agent',
    name: 'Secret Agent',
    price: 0,
    primaryColor: '#1E293B',
    accentColor: '#38BDF8',
  },
  {
    id: 'monk',
    name: 'Shadow Ninja',
    price: 2000,
    primaryColor: '#F59E0B',
    accentColor: '#FEF3C7',
  },
  {
    id: 'wizard',
    name: 'Arcane Wizard',
    price: 5000,
    primaryColor: '#8B5CF6',
    accentColor: '#DDD6FE',
  },
  {
    id: 'astronaut',
    name: 'Star Commander',
    price: 10000,
    primaryColor: '#E2E8F0',
    accentColor: '#FBBF24',
  },
  {
    id: 'dj',
    name: 'Cyber DJ',
    price: 18000,
    primaryColor: '#EC4899',
    accentColor: '#38BDF8',
  },
];

// Significantly higher prices across all shields as protection angle increases
export const SHIELD_SKINS: SkinItem<ShieldSkinId>[] = [
  {
    id: 'iron',
    name: 'Iron Shield',
    price: 0,
    primaryColor: '#94A3B8',
    accentColor: '#F8FAFC',
    safetyDegrees: 90,
  },
  {
    id: 'pan',
    name: 'Cast Iron Pan',
    price: 2500,
    primaryColor: '#334155',
    accentColor: '#F59E0B',
    safetyDegrees: 120,
  },
  {
    id: 'lightsaber',
    name: 'Plasma Blade',
    price: 6000,
    primaryColor: '#10B981',
    accentColor: '#ECFDF5',
    safetyDegrees: 180,
  },
  {
    id: 'rune',
    name: 'Magical Rune Wall',
    price: 12000,
    primaryColor: '#38BDF8',
    accentColor: '#BAE6FD',
    safetyDegrees: 220,
  },
  {
    id: 'vinyl',
    name: 'Sonic Vinyl Shield',
    price: 22000,
    primaryColor: '#1E293B',
    accentColor: '#F43F5E',
    safetyDegrees: 270,
  },
  {
    id: 'donut',
    name: 'Giant Donut',
    price: 35000,
    primaryColor: '#F472B6',
    accentColor: '#FDE047',
    safetyDegrees: 360,
  },
];

export const PROJECTILE_SKINS: SkinItem<ProjectileSkinId>[] = [
  {
    id: 'bullet',
    name: 'Sniper Bullets',
    price: 0,
    primaryColor: '#F59E0B',
    accentColor: '#FEF3C7',
  },
  {
    id: 'arrow',
    name: 'Flaming Arrows',
    price: 1800,
    primaryColor: '#EA580C',
    accentColor: '#FDE047',
  },
  {
    id: 'shuriken',
    name: 'Ninja Shurikens',
    price: 4500,
    primaryColor: '#38BDF8',
    accentColor: '#F1F5F9',
  },
  {
    id: 'laser',
    name: 'Laser Beams',
    price: 9000,
    primaryColor: '#A855F7',
    accentColor: '#F3E8FF',
  },
  {
    id: 'tomato',
    name: 'Rotten Tomatoes',
    price: 15000,
    primaryColor: '#EF4444',
    accentColor: '#22C55E',
  },
];

export const TRAIL_SKINS: SkinItem<TrailSkinId>[] = [
  {
    id: 'silver',
    name: 'Silver Wind',
    price: 0,
    primaryColor: '#94A3B8',
    accentColor: '#E2E8F0',
  },
  {
    id: 'red',
    name: 'Crimson Flare',
    price: 1500,
    primaryColor: '#F43F5E',
    accentColor: '#FDA4AF',
  },
  {
    id: 'blue',
    name: 'Ocean Surge',
    price: 4000,
    primaryColor: '#38BDF8',
    accentColor: '#BAE6FD',
  },
  {
    id: 'rainbow',
    name: 'Rainbow Prism',
    price: 10000,
    primaryColor: '#F59E0B',
    accentColor: '#EC4899',
  },
];

export function getShieldSafetyRadians(shieldId: ShieldSkinId): number {
  const found = SHIELD_SKINS.find((s) => s.id === shieldId);
  const deg = found?.safetyDegrees ?? 90;
  return (deg * Math.PI) / 180;
}

export interface PlayerLoadout {
  character: CharacterSkinId;
  shield: ShieldSkinId;
  projectile: ProjectileSkinId;
  trail: TrailSkinId;
}

export interface UnlockedStoreState {
  coins: number;
  bestScore: number;
  highestUnlockedLevel: number; // 1 to 100
  unlockedCharacters: CharacterSkinId[];
  unlockedShields: ShieldSkinId[];
  unlockedProjectiles: ProjectileSkinId[];
  unlockedTrails: TrailSkinId[];
  loadout: PlayerLoadout;
}

const STORAGE_KEY = 'orbit_deflect_profile_v5';

export const DEFAULT_PROFILE: UnlockedStoreState = {
  coins: 60,
  bestScore: 0,
  highestUnlockedLevel: 1,
  unlockedCharacters: ['agent'],
  unlockedShields: ['iron'],
  unlockedProjectiles: ['bullet'],
  unlockedTrails: ['silver'],
  loadout: {
    character: 'agent',
    shield: 'iron',
    projectile: 'bullet',
    trail: 'silver',
  },
};

export function loadPlayerProfile(): UnlockedStoreState {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      loadout: {
        ...DEFAULT_PROFILE.loadout,
        ...(parsed.loadout || {}),
      },
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function savePlayerProfile(profile: UnlockedStoreState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore storage errors
  }
}

export type InfinityGiftType = 'dual_shield' | 'extra_life' | 'triple_weapon' | 'full_aegis';

export interface InfinityGiftDrop {
  id: number;
  type: InfinityGiftType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  label: string;
  color: string;
}
