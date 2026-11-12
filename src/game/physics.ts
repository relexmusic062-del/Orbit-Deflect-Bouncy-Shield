export type ShieldStanceId = 'brass' | 'striker' | 'prism';

export interface ShieldStanceConfig {
  id: ShieldStanceId;
  keyBinding: '1' | '2' | '3';
  name: string;
  hindiSubtitle: string;
  roleClue: string;
  arcSpan: number; // default fallback arc in radians
  speedMultiplier: number;
  bankCurvature: number;
  pierceCount: number;
  splitBullets: boolean;
  wallBounces: number;
  color: string;
  accentColor: string;
}

export const SHIELD_STANCES: Record<ShieldStanceId, ShieldStanceConfig> = {
  brass: {
    id: 'brass',
    keyBinding: '1',
    name: 'Balanced',
    hindiSubtitle: 'Wide Arc',
    roleClue: 'Wide Arc',
    arcSpan: Math.PI * 0.5, // 90 deg default
    speedMultiplier: 1.35,
    bankCurvature: 0.72,
    pierceCount: 1,
    splitBullets: false,
    wallBounces: 0,
    color: '#F59E0B',
    accentColor: '#FEF3C7',
  },
  striker: {
    id: 'striker',
    keyBinding: '2',
    name: 'Striker',
    hindiSubtitle: 'Fast Bounce',
    roleClue: 'Pierce & Wall Bounce',
    arcSpan: Math.PI * 0.5,
    speedMultiplier: 1.68,
    bankCurvature: 1.1,
    pierceCount: 2,
    splitBullets: false,
    wallBounces: 2,
    color: '#10B981',
    accentColor: '#D1FAE5',
  },
  prism: {
    id: 'prism',
    keyBinding: '3',
    name: 'Split Shot',
    hindiSubtitle: 'Twin Bolt',
    roleClue: 'Splits Bullet in 2',
    arcSpan: Math.PI * 0.5,
    speedMultiplier: 1.28,
    bankCurvature: 0.85,
    pierceCount: 1,
    splitBullets: true,
    wallBounces: 1,
    color: '#38BDF8',
    accentColor: '#E0F2FE',
  },
};

export interface Vec2 {
  x: number;
  y: number;
}

export type EnemyArchetype = 'marksman' | 'flanker' | 'burst' | 'bastion';
export type EnemyBulletType = 'sniper_round' | 'zombie_acid' | 'alien_plasma' | 'juggernaut_core';

export interface EnemyBulletSpec {
  bulletType: EnemyBulletType;
  powerLevel: number; // 1, 2, or 3+
  damage: number;
  speedMultiplier: number;
  radius: number;
  color: string;
  coreColor: string;
}

export function getEnemyBulletSpec(archetype: EnemyArchetype, levelTier: number): EnemyBulletSpec {
  const powerLevel = levelTier >= 35 ? 3 : levelTier >= 12 ? 2 : 1;
  const tierSpeedBoost = 1 + Math.min(0.35, (levelTier - 1) * 0.005);

  if (archetype === 'flanker') {
    // Zombie Mutant: Toxic Acid Skull / Bio-Glob
    return {
      bulletType: 'zombie_acid',
      powerLevel,
      damage: powerLevel >= 3 ? 2 : 1,
      speedMultiplier: 1.06 * tierSpeedBoost,
      radius: 7 + (powerLevel - 1) * 1.2,
      color: '#22C55E',
      coreColor: '#BEF264',
    };
  }
  if (archetype === 'burst') {
    // Alien Invader: Twin Plasma Ring Bolt
    return {
      bulletType: 'alien_plasma',
      powerLevel,
      damage: 1,
      speedMultiplier: 1.02 * tierSpeedBoost,
      radius: 6.8 + (powerLevel - 1) * 1.0,
      color: '#A855F7',
      coreColor: '#38BDF8',
    };
  }
  if (archetype === 'bastion') {
    // Cyber-Juggernaut Boss: Heavy Magma Core Cannonball (High Power!)
    return {
      bulletType: 'juggernaut_core',
      powerLevel: Math.max(2, powerLevel),
      damage: 2,
      speedMultiplier: 0.9 * tierSpeedBoost,
      radius: 9.5 + (powerLevel - 1) * 1.5,
      color: '#EF4444',
      coreColor: '#FDE047',
    };
  }
  // Human Sniper Mercenary: High-Velocity Brass Calibre Round
  return {
    bulletType: 'sniper_round',
    powerLevel,
    damage: 1,
    speedMultiplier: 1.0 * tierSpeedBoost,
    radius: 6.5 + (powerLevel - 1) * 0.8,
    color: '#F59E0B',
    coreColor: '#FFFBEB',
  };
}

export interface BulletState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isDeflected: boolean;
  deflectCount: number;
  pierceRemaining: number;
  wallBouncesRemaining: number;
  sourceEnemyId: number;
  sourceArchetype?: EnemyArchetype;
  bulletType?: EnemyBulletType;
  powerLevel?: number;
  damage?: number;
  isPowerDeflect: boolean;
  color: string;
  coreColor?: string;
  spinAngle: number;
  trail: Vec2[];
}

export interface EnemyState {
  id: number;
  archetype: EnemyArchetype;
  levelTier?: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  angleToCenter: number;
  orbitDir: 1 | -1;
  standoffDist: number;
  phase: 'entering' | 'positioning' | 'aiming' | 'firing' | 'recovering' | 'ko';
  phaseTimer: number;
  aimDuration: number;
  burstRemaining: number;
  hitFlashTimer: number;
  koTimer: number;
  koVx: number;
  koVy: number;
}

export function normalizeAngle(angle: number): number {
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function shortestAngleDiff(from: number, to: number): number {
  return normalizeAngle(to - from);
}

export function stepAngleTowards(current: number, target: number, maxStep: number): number {
  const diff = shortestAngleDiff(current, target);
  if (Math.abs(diff) <= maxStep) {
    return normalizeAngle(target);
  }
  return normalizeAngle(current + Math.sign(diff) * maxStep);
}

export interface ShieldInterceptResult {
  hit: boolean;
  hitAngle: number;
  normalizedArcOffset: number;
  normalX: number;
  normalY: number;
  reflectedVx: number;
  reflectedVy: number;
  impactX: number;
  impactY: number;
}

export function checkShieldDeflection(
  bullet: Pick<BulletState, 'x' | 'y' | 'vx' | 'vy' | 'radius' | 'isDeflected'>,
  cx: number,
  cy: number,
  orbitRadius: number,
  shieldAngle: number,
  shieldAngularVel: number,
  stance: ShieldStanceConfig,
  pulseActive: boolean,
  enemies: Pick<EnemyState, 'id' | 'x' | 'y' | 'radius' | 'phase'>[] = [],
  hasDualShield: boolean = false,
  overrideArcSpanRadians?: number
): ShieldInterceptResult | null {
  if (bullet.isDeflected) return null;

  const dx = bullet.x - cx;
  const dy = bullet.y - cy;
  const dist = Math.hypot(dx, dy);

  const shieldThickness = pulseActive ? 24 : 16;
  const minR = orbitRadius - shieldThickness * 0.55 - bullet.radius;
  const maxR = orbitRadius + shieldThickness * 0.65 + bullet.radius;

  if (dist < minR || dist > maxR) {
    return null;
  }

  const radialDot = dx * bullet.vx + dy * bullet.vy;
  if (radialDot > 20) {
    return null;
  }

  const bulletAngle = Math.atan2(dy, dx);
  const baseArc = overrideArcSpanRadians ?? stance.arcSpan;
  const effectiveArc = Math.min(Math.PI * 2, baseArc * (pulseActive ? 1.25 : 1.0));
  const halfArc = effectiveArc / 2;
  const angularRadiusPadding = Math.atan2(bullet.radius + 4, orbitRadius);

  // Full 360-degree shield (e.g. Giant Donut or 360 Aegis) intercepts from any angle!
  let angleOffset = shortestAngleDiff(shieldAngle, bulletAngle);
  if (effectiveArc < Math.PI * 1.98 && Math.abs(angleOffset) > halfArc + angularRadiusPadding) {
    if (hasDualShield) {
      const secondaryAngle = normalizeAngle(shieldAngle + Math.PI);
      const secOffset = shortestAngleDiff(secondaryAngle, bulletAngle);
      if (Math.abs(secOffset) <= halfArc + angularRadiusPadding) {
        angleOffset = secOffset;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  const clampedOffset =
    effectiveArc >= Math.PI * 1.98
      ? 0
      : Math.max(-1, Math.min(1, angleOffset / Math.max(0.01, halfArc)));

  const normalAngle = normalizeAngle(
    bulletAngle +
      clampedOffset * stance.bankCurvature * 0.55 +
      Math.max(-0.18, Math.min(0.18, shieldAngularVel * 0.015))
  );

  const normalX = Math.cos(normalAngle);
  const normalY = Math.sin(normalAngle);

  const inSpeed = Math.hypot(bullet.vx, bullet.vy);
  const spinBoost = Math.min(
    1.22,
    1 + Math.abs(shieldAngularVel) * 0.025 + (pulseActive ? 0.25 : 0)
  );
  const outSpeed = Math.max(460, inSpeed * stance.speedMultiplier * spinBoost);

  const vDotN = bullet.vx * normalX + bullet.vy * normalY;
  let rx = bullet.vx - 2 * vDotN * normalX;
  let ry = bullet.vy - 2 * vDotN * normalY;

  const radialOutX = Math.cos(bulletAngle);
  const radialOutY = Math.sin(bulletAngle);
  if (rx * radialOutX + ry * radialOutY < 0.2 * Math.hypot(rx, ry)) {
    rx = normalX;
    ry = normalY;
  }

  let outAngle = Math.atan2(ry, rx);

  const impactX = cx + Math.cos(bulletAngle) * (orbitRadius + bullet.radius + 2);
  const impactY = cy + Math.sin(bulletAngle) * (orbitRadius + bullet.radius + 2);

  let bestEnemyAngle: number | null = null;
  let bestAngularError = 0.36;

  for (const enemy of enemies) {
    if (enemy.phase === 'ko') continue;
    const toEnemyAngle = Math.atan2(enemy.y - impactY, enemy.x - impactX);
    const err = Math.abs(shortestAngleDiff(outAngle, toEnemyAngle));
    if (err < bestAngularError) {
      bestAngularError = err;
      bestEnemyAngle = toEnemyAngle;
    }
  }

  if (bestEnemyAngle !== null) {
    const assistStrength = 0.72;
    outAngle = normalizeAngle(outAngle + shortestAngleDiff(outAngle, bestEnemyAngle) * assistStrength);
  }

  const reflectedVx = Math.cos(outAngle) * outSpeed;
  const reflectedVy = Math.sin(outAngle) * outSpeed;

  return {
    hit: true,
    hitAngle: bulletAngle,
    normalizedArcOffset: clampedOffset,
    normalX,
    normalY,
    reflectedVx,
    reflectedVy,
    impactX,
    impactY,
  };
}

export interface LevelConfig {
  level: number;
  totalEnemiesInLevel: number;
  maxConcurrentEnemies: number;
  maxConcurrentAttackers: number;
  bulletSpeed: number;
  aimTelegraphDuration: number;
  staggerDelayBetweenShots: number;
  coinReward: number;
  allowedArchetypes: EnemyArchetype[];
}

export function getLevelConfig(level: number): LevelConfig {
  const clampedLevel = Math.max(1, Math.min(100, Math.floor(level)));

  if (clampedLevel === 1) {
    return {
      level: 1,
      totalEnemiesInLevel: 4,
      maxConcurrentEnemies: 2,
      maxConcurrentAttackers: 1,
      bulletSpeed: 270,
      aimTelegraphDuration: 0.95,
      staggerDelayBetweenShots: 0.85,
      coinReward: 19,
      allowedArchetypes: ['marksman'],
    };
  }

  const totalEnemies = Math.min(28, 4 + Math.floor(clampedLevel * 1.35));
  const maxConcurrent = Math.min(6, 2 + Math.floor(clampedLevel / 2));
  const maxAttackers = Math.min(4, 1 + Math.floor(clampedLevel / 2));
  const bulletSpeed = Math.min(480, 275 + clampedLevel * 4.2);
  const aimTelegraph = Math.max(0.46, 0.9 - clampedLevel * 0.008);
  const staggerDelay = Math.max(0.22, 0.72 - clampedLevel * 0.01);
  // Balanced so reaching Level 55-70 accumulates ~4,200-6,500 coins for the 270° and 360° shields
  const coinReward = 18 + Math.floor(clampedLevel * 1.4);

  const archetypes: EnemyArchetype[] = ['marksman'];
  if (clampedLevel >= 2) archetypes.push('flanker');
  if (clampedLevel >= 3) archetypes.push('burst');
  if (clampedLevel >= 5) archetypes.push('bastion');

  return {
    level: clampedLevel,
    totalEnemiesInLevel: totalEnemies,
    maxConcurrentEnemies: maxConcurrent,
    maxConcurrentAttackers: maxAttackers,
    bulletSpeed,
    aimTelegraphDuration: aimTelegraph,
    staggerDelayBetweenShots: staggerDelay,
    coinReward,
    allowedArchetypes: archetypes,
  };
}

export function getWaveDifficulty(level: number) {
  const cfg = getLevelConfig(level);
  return {
    wave: cfg.level,
    totalEnemiesInWave: cfg.totalEnemiesInLevel,
    maxConcurrentEnemies: cfg.maxConcurrentEnemies,
    maxConcurrentAttackers: cfg.maxConcurrentAttackers,
    bulletSpeed: cfg.bulletSpeed,
    aimTelegraphDuration: cfg.aimTelegraphDuration,
    staggerDelayBetweenShots: cfg.staggerDelayBetweenShots,
    allowedArchetypes: cfg.allowedArchetypes,
  };
}

export function getInfinityDifficulty(elapsedSeconds: number, enemiesDefeated: number) {
  const virtualTier = 1 + Math.floor(elapsedSeconds / 18) + Math.floor(enemiesDefeated / 6);
  const cfg = getLevelConfig(Math.min(100, virtualTier));
  return {
    tier: virtualTier,
    maxConcurrentEnemies: cfg.maxConcurrentEnemies,
    maxConcurrentAttackers: cfg.maxConcurrentAttackers,
    bulletSpeed: cfg.bulletSpeed,
    aimTelegraphDuration: cfg.aimTelegraphDuration,
    staggerDelayBetweenShots: cfg.staggerDelayBetweenShots,
    allowedArchetypes: cfg.allowedArchetypes,
  };
}

export function calculateKillScore(
  archetype: EnemyArchetype,
  combo: number,
  isBankShot: boolean,
  isPowerDeflect: boolean
): number {
  const baseMap: Record<EnemyArchetype, number> = {
    marksman: 100,
    flanker: 140,
    burst: 175,
    bastion: 250,
  };
  const base = baseMap[archetype] ?? 100;
  const comboMult = 1 + Math.min(4, Math.max(0, combo - 1) * 0.25);
  const bankBonus = isBankShot ? 1.5 : 1.0;
  const powerBonus = isPowerDeflect ? 1.25 : 1.0;
  return Math.round(base * comboMult * bankBonus * powerBonus);
}

// Calculates modest coin rewards per kill so Infinity Mode does not flood the economy
export function calculateKillCoins(
  isInfinity: boolean,
  totalDefeatedInRun: number,
  isBankShot: boolean
): number {
  if (isInfinity) {
    // In Infinity Mode, only award 1 coin every 3rd kill (+1 extra on a bank shot every 3rd kill)
    if (totalDefeatedInRun % 3 === 0) {
      return isBankShot ? 2 : 1;
    }
    return 0;
  }
  // In Level Mode, award 1 coin per kill (2 on bank shot)
  return isBankShot ? 2 : 1;
}
