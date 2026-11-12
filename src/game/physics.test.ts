import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAngle,
  shortestAngleDiff,
  stepAngleTowards,
  checkShieldDeflection,
  getLevelConfig,
  getInfinityDifficulty,
  calculateKillScore,
  calculateKillCoins,
  getEnemyBulletSpec,
  SHIELD_STANCES,
} from './physics';
import {
  CHARACTER_SKINS,
  SHIELD_SKINS,
  PROJECTILE_SKINS,
  TRAIL_SKINS,
  getShieldSafetyRadians,
} from './catalog';

test('normalizeAngle wraps angles cleanly into [-PI, PI]', () => {
  assert.ok(
    Math.abs(normalizeAngle(Math.PI * 3) - Math.PI) < 1e-6 ||
      Math.abs(normalizeAngle(Math.PI * 3) + Math.PI) < 1e-6
  );
  assert.ok(Math.abs(normalizeAngle(0)) < 1e-6);
  assert.ok(Math.abs(normalizeAngle(-Math.PI * 2)) < 1e-6);
});

test('shortestAngleDiff computes shortest signed rotation across +/-PI boundary', () => {
  const from = Math.PI - 0.1;
  const to = -Math.PI + 0.1;
  const diff = shortestAngleDiff(from, to);
  assert.ok(Math.abs(diff - 0.2) < 1e-5);
});

test('stepAngleTowards steps toward target without overshooting', () => {
  const next = stepAngleTowards(0, 1.0, 0.3);
  assert.ok(Math.abs(next - 0.3) < 1e-6);
  const exact = stepAngleTowards(0.8, 1.0, 0.5);
  assert.ok(Math.abs(exact - 1.0) < 1e-6);
});

test('checkShieldDeflection bounces a centered radial bullet straight back outward', () => {
  const cx = 500;
  const cy = 400;
  const orbitRadius = 68;
  const bullet = {
    x: cx + orbitRadius,
    y: cy,
    vx: -300,
    vy: 0,
    radius: 6,
    isDeflected: false,
  };

  const result = checkShieldDeflection(
    bullet,
    cx,
    cy,
    orbitRadius,
    0,
    0,
    SHIELD_STANCES.brass,
    false,
    []
  );

  assert.notEqual(result, null);
  assert.equal(result!.hit, true);
  assert.ok(result!.reflectedVx > 350);
  assert.ok(Math.abs(result!.reflectedVy) < 1e-3);
});

test('checkShieldDeflection supports 180, 270, and 360 degree shield safety angles and steeply scaled prices', () => {
  const cx = 500;
  const cy = 400;
  const orbitRadius = 68;

  const backBullet = {
    x: cx - orbitRadius,
    y: cy,
    vx: 300,
    vy: 0,
    radius: 6,
    isDeflected: false,
  };

  const ironMiss = checkShieldDeflection(
    backBullet,
    cx,
    cy,
    orbitRadius,
    0,
    0,
    SHIELD_STANCES.brass,
    false,
    [],
    false,
    getShieldSafetyRadians('iron')
  );
  assert.equal(ironMiss, null);

  const donutHit = checkShieldDeflection(
    backBullet,
    cx,
    cy,
    orbitRadius,
    0,
    0,
    SHIELD_STANCES.brass,
    false,
    [],
    false,
    getShieldSafetyRadians('donut')
  );
  assert.notEqual(donutHit, null);
  assert.equal(donutHit!.hit, true);

  // Verify shield prices increase steeply with protection angle and top shield costs >= 30,000
  for (let i = 1; i < SHIELD_SKINS.length; i++) {
    assert.ok(SHIELD_SKINS[i].price > SHIELD_SKINS[i - 1].price);
    assert.ok((SHIELD_SKINS[i].safetyDegrees ?? 0) > (SHIELD_SKINS[i - 1].safetyDegrees ?? 0));
  }
  assert.ok(SHIELD_SKINS[SHIELD_SKINS.length - 1].price >= 30000);
  assert.ok(CHARACTER_SKINS[CHARACTER_SKINS.length - 1].price >= 15000);
  assert.ok(PROJECTILE_SKINS[PROJECTILE_SKINS.length - 1].price >= 12000);
  assert.ok(TRAIL_SKINS[TRAIL_SKINS.length - 1].price >= 8000);
});

test('getEnemyBulletSpec assigns unique projectile types and power scaling per enemy archetype', () => {
  const sniper = getEnemyBulletSpec('marksman', 1);
  const zombie = getEnemyBulletSpec('flanker', 15);
  const alien = getEnemyBulletSpec('burst', 20);
  const juggernaut = getEnemyBulletSpec('bastion', 40);

  assert.equal(sniper.bulletType, 'sniper_round');
  assert.equal(zombie.bulletType, 'zombie_acid');
  assert.equal(alien.bulletType, 'alien_plasma');
  assert.equal(juggernaut.bulletType, 'juggernaut_core');
  assert.equal(juggernaut.damage, 2);
  assert.ok(juggernaut.powerLevel > sniper.powerLevel);
});

test('calculateKillCoins restricts Infinity Mode coin payouts compared to Level Mode', () => {
  assert.equal(calculateKillCoins(false, 1, false), 1);
  assert.equal(calculateKillCoins(false, 1, true), 2);
  // Infinity mode only grants coins on every 3rd kill
  assert.equal(calculateKillCoins(true, 1, false), 0);
  assert.equal(calculateKillCoins(true, 2, true), 0);
  assert.equal(calculateKillCoins(true, 3, false), 1);
});

test('getLevelConfig supports 100 levels with fixed enemies and coin rewards', () => {
  const lvl1 = getLevelConfig(1);
  const lvl50 = getLevelConfig(50);
  const lvl100 = getLevelConfig(100);

  assert.equal(lvl1.level, 1);
  assert.equal(lvl1.maxConcurrentAttackers, 1);
  assert.ok(lvl50.totalEnemiesInLevel > lvl1.totalEnemiesInLevel);
  assert.equal(lvl100.level, 100);
  assert.ok(lvl100.coinReward > lvl1.coinReward);
});

test('getInfinityDifficulty scales harder as survival time and kills increase', () => {
  const early = getInfinityDifficulty(2, 0);
  const late = getInfinityDifficulty(110, 30);

  assert.ok(late.tier > early.tier);
  assert.ok(late.bulletSpeed > early.bulletSpeed);
  assert.ok(late.maxConcurrentAttackers >= 3);
});

test('Shop catalog contains all requested characters, shields, projectiles, and trails', () => {
  assert.equal(CHARACTER_SKINS.length, 5);
  assert.equal(SHIELD_SKINS.length, 6);
  assert.equal(PROJECTILE_SKINS.length, 5);
  assert.equal(TRAIL_SKINS.length, 4);
});

test('calculateKillScore rewards combo and bank shots', () => {
  const baseKill = calculateKillScore('marksman', 1, false, false);
  const bankComboKill = calculateKillScore('marksman', 3, true, true);
  assert.equal(baseKill, 100);
  assert.ok(bankComboKill > baseKill * 2);
});
