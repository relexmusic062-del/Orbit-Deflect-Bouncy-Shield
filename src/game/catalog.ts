export type CharacterSkinId = 'agent' | 'monk' | 'wizard' | 'astronaut' | 'dj';
export type ShieldSkinId = 'iron' | 'pan' | 'lightsaber' | 'rune' | 'vinyl' | 'donut';
export type ProjectileSkinId = 'bullet' | 'arrow' | 'shuriken' | 'laser' | 'tomato';
export type TrailSkinId = 'silver' | 'red' | 'blue' | 'rainbow';

export type GameMode = 'level' | 'infinity';

export interface SkinItem<T extends string> {
  id: T;
  name: string;
  subtitle: string;
  price: number;
  primaryColor: string;
  accentColor: string;
}

export const CHARACTER_SKINS: SkinItem<CharacterSkinId>[] = [
  {
    id: 'agent',
    name: 'Secret Agent',
    subtitle: 'Black Suit & Shades',
    price: 0,
    primaryColor: '#1E293B',
    accentColor: '#F8FAFC',
  },
  {
    id: 'monk',
    name: 'Zen Monk',
    subtitle: 'Lotus Meditation',
    price: 120,
    primaryColor: '#F59E0B',
    accentColor: '#FEF3C7',
  },
  {
    id: 'wizard',
    name: 'Arcane Wizard',
    subtitle: 'Floating Levitation',
    price: 200,
    primaryColor: '#8B5CF6',
    accentColor: '#DDD6FE',
  },
  {
    id: 'astronaut',
    name: 'Star Astronaut',
    subtitle: 'Gold Visor Suit',
    price: 280,
    primaryColor: '#E2E8F0',
    accentColor: '#FBBF24',
  },
  {
    id: 'dj',
    name: 'Turntable DJ',
    subtitle: 'Live Mixing Deck',
    price: 350,
    primaryColor: '#EC4899',
    accentColor: '#38BDF8',
  },
];

export const SHIELD_SKINS: SkinItem<ShieldSkinId>[] = [
  {
    id: 'iron',
    name: 'Iron Shield',
    subtitle: 'Classic Metal Dhaal',
    price: 0,
    primaryColor: '#94A3B8',
    accentColor: '#F8FAFC',
  },
  {
    id: 'pan',
    name: 'Cast Iron Pan',
    subtitle: 'Iconic "TING!" Sound',
    price: 150,
    primaryColor: '#334155',
    accentColor: '#F59E0B',
  },
  {
    id: 'lightsaber',
    name: 'Laser Sword',
    subtitle: 'Glowing Neon Blade',
    price: 220,
    primaryColor: '#10B981',
    accentColor: '#ECFDF5',
  },
  {
    id: 'rune',
    name: 'Magical Rune Wall',
    subtitle: 'Transparent Arcane Barrier',
    price: 260,
    primaryColor: '#38BDF8',
    accentColor: '#BAE6FD',
  },
  {
    id: 'vinyl',
    name: 'Vinyl Record',
    subtitle: 'Spinning Music Disc',
    price: 300,
    primaryColor: '#1E293B',
    accentColor: '#F43F5E',
  },
  {
    id: 'donut',
    name: 'Giant Donut',
    subtitle: 'Pops Sprinkles on Hit',
    price: 340,
    primaryColor: '#F472B6',
    accentColor: '#FDE047',
  },
];

export const PROJECTILE_SKINS: SkinItem<ProjectileSkinId>[] = [
  {
    id: 'bullet',
    name: 'Sniper Bullets',
    subtitle: 'High-Speed Brass',
    price: 0,
    primaryColor: '#F59E0B',
    accentColor: '#FEF3C7',
  },
  {
    id: 'arrow',
    name: 'Flaming Arrows',
    subtitle: 'Blazing Fire Burst',
    price: 140,
    primaryColor: '#EA580C',
    accentColor: '#FDE047',
  },
  {
    id: 'shuriken',
    name: 'Ninja Shurikens',
    subtitle: 'Spinning Steel Stars',
    price: 180,
    primaryColor: '#38BDF8',
    accentColor: '#F1F5F9',
  },
  {
    id: 'laser',
    name: 'Laser Beams',
    subtitle: 'Sci-Fi Plasma Bolts',
    price: 240,
    primaryColor: '#A855F7',
    accentColor: '#F3E8FF',
  },
  {
    id: 'tomato',
    name: 'Rotten Tomatoes',
    subtitle: 'Juicy Red Splat',
    price: 290,
    primaryColor: '#EF4444',
    accentColor: '#22C55E',
  },
];

export const TRAIL_SKINS: SkinItem<TrailSkinId>[] = [
  {
    id: 'silver',
    name: 'Silver Ribbon',
    subtitle: 'Clean Motion Trail',
    price: 0,
    primaryColor: '#94A3B8',
    accentColor: '#E2E8F0',
  },
  {
    id: 'red',
    name: 'Crimson Neon',
    subtitle: 'Blazing Red Rope',
    price: 100,
    primaryColor: '#F43F5E',
    accentColor: '#FDA4AF',
  },
  {
    id: 'blue',
    name: 'Cyber Cobalt',
    subtitle: 'Electric Blue Rope',
    price: 150,
    primaryColor: '#38BDF8',
    accentColor: '#BAE6FD',
  },
  {
    id: 'rainbow',
    name: 'Rainbow Prism',
    subtitle: 'Full Spectrum Ribbon',
    price: 320,
    primaryColor: '#F59E0B',
    accentColor: '#EC4899',
  },
];

export interface PlayerLoadout {
  character: CharacterSkinId;
  shield: ShieldSkinId;
  projectile: ProjectileSkinId;
  trail: TrailSkinId;
}

export interface UnlockedStoreState {
  coins: number;
  highestUnlockedLevel: number; // 1 to 100
  unlockedCharacters: CharacterSkinId[];
  unlockedShields: ShieldSkinId[];
  unlockedProjectiles: ProjectileSkinId[];
  unlockedTrails: TrailSkinId[];
  loadout: PlayerLoadout;
}

const STORAGE_KEY = 'orbit_deflect_profile_v2';

export const DEFAULT_PROFILE: UnlockedStoreState = {
  coins: 250, // Starter coins so players can immediately try the Shop
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

export type InfinityGiftType = 'dual_shield' | 'extra_life' | 'triple_weapon';

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
