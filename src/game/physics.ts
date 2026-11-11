export type ShieldStanceId = 'brass' | 'striker' | 'prism';

export interface ShieldStanceConfig {
  id: ShieldStanceId;
  keyBinding: '1' | '2' | '3';
  name: string;
  hindiSubtitle: string;
  roleClue: string;
  arcSpan: number; // total angular width in radians
  speedMultiplier: number;
  bankCurvature: number; // how strongly hitting off-center angles the reflection normal
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
    roleClue: 'Wide 62° Arc',
    arcSpan: 1.08,
    speedMultiplier: 1.32,
    bankCurvature: 0.75,
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
    arcSpan: 0.84,
    speedMultiplier: 1.68,
    bankCurvature: 1.15,
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
    arcSpan: 0.96,
    speedMultiplier: 1.25,
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
  isPowerDeflect: boolean;
  color: string;
  spinAngle: number;
  trail: Vec2[];
}

export type EnemyArchetype = 'marksman' | 'flanker' | 'burst' | 'bastion';

export interface EnemyState {
  id: number;
  archetype: EnemyArchetype;
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

/**
 * Normalizes any angle in radians to the range [-PI, PI].
 */
export function normalizeAngle(angle: number): number {
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Shortest signed angular difference from `from` to `to` in [-PI, PI].
 */
export function shortestAngleDiff(from: number, to: number): number {
  return normalizeAngle(to - from);
}

/**
 * Smoothly interpolates an angle toward a target angle with a maximum step.
 */
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
  hasDualShield: boolean = false
): ShieldInterceptResult | null {
  if (bullet.isDeflected) return null;

  const dx = bullet.x - cx;
  const dy = bullet.y - cy;
  const dist = Math.hypot(dx, dy);

  const shieldThickness = pulseActive ? 24 : 15;
  const minR = orbitRadius - shieldThickness * 0.55 - bullet.radius;
  const maxR = orbitRadius + shieldThickness * 0.65 + bullet.radius;

  if (dist < minR || dist > maxR) {
    return null;
  }

  // Ensure bullet is moving generally inward toward the shield/center
  const radialDot = dx * bullet.vx + dy * bullet.vy;
  if (radialDot > 20) {
    return null;
  }

  const bulletAngle = Math.atan2(dy, dx);
  const halfArc = (stance.arcSpan * (pulseActive ? 1.35 : 1.0)) / 2;
  const angularRadiusPadding = Math.atan2(bullet.radius + 4, orbitRadius);

  // Check primary shield at `shieldAngle` or secondary gift shield at `shieldAngle + PI`
  let angleOffset = shortestAngleDiff(shieldAngle, bulletAngle);
  if (Math.abs(angleOffset) > halfArc + angularRadiusPadding) {
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

  const clampedOffset = Math.max(-1, Math.min(1, angleOffset / Math.max(0.01, halfArc)));

  const normalAngle = normalizeAngle(
    bulletAngle +
      clampedOffset * stance.bankCurvature * 0.62 +
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
  let bestAngularError = 0.34;

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
    const assistStrength = stance.id === 'brass' ? 0.70 : 0.56;
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
  level: number; // 1 to 100
  totalEnemiesInLevel: number;
  maxConcurrentEnemies: number;
  maxConcurrentAttackers: number;
  bulletSpeed: number;
  aimTelegraphDuration: number;
  staggerDelayBetweenShots: number;
  coinReward: number;
  allowedArchetypes: EnemyArchetype[];
}

/**
 * Generates deterministic difficulty & fixed enemy count for Level Mode (Levels 1 to 100).
 */
export function getLevelConfig(level: number): LevelConfig {
  const clampedLevel = Math.max(1, Math.min(100, Math.floor(level)));

  if (clampedLevel === 1) {
    return {
      level: 1,
      totalEnemiesInLevel: 4,
      maxConcurrentEnemies: 2,
      maxConcurrentAttackers: 1,
      bulletSpeed: 280,
      aimTelegraphDuration: 0.95,
      staggerDelayBetweenShots: 0.85,
      coinReward: 45,
      allowedArchetypes: ['marksman'],
    };
  }

  const totalEnemies = Math.min(28, 4 + Math.floor(clampedLevel * 1.35));
  const maxConcurrent = Math.min(6, 2 + Math.floor(clampedLevel / 2));
  const maxAttackers = Math.min(4, 1 + Math.floor(clampedLevel / 2));
  const bulletSpeed = Math.min(480, 285 + clampedLevel * 4.5);
  const aimTelegraph = Math.max(0.46, 0.90 - clampedLevel * 0.008);
  const staggerDelay = Math.max(0.22, 0.72 - clampedLevel * 0.01);
  const coinReward = 40 + clampedLevel * 12;

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

/**
 * Backwards-compatible alias for getLevelConfig.
 */
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

/**
 * Dynamic difficulty scaling for Infinity Mode based on elapsed survival time and kills.
 */
export function getInfinityDifficulty(elapsedSeconds: number, enemiesDefeated: number) {
  const virtualTier = 1 + Math.floor(elapsedSeconds / 15) + Math.floor(enemiesDefeated / 5);
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
