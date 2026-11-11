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
  SHIELD_STANCES,
} from './physics';
import {
  CHARACTER_SKINS,
  SHIELD_SKINS,
  PROJECTILE_SKINS,
  TRAIL_SKINS,
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

test('checkShieldDeflection banks an off-center bullet at a Carrom/Billiards angle', () => {
  const cx = 500;
  const cy = 400;
  const orbitRadius = 68;
  const bulletAngle = 0.35;
  const bullet = {
    x: cx + Math.cos(bulletAngle) * orbitRadius,
    y: cy + Math.sin(bulletAngle) * orbitRadius,
    vx: -Math.cos(bulletAngle) * 300,
    vy: -Math.sin(bulletAngle) * 300,
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
    SHIELD_STANCES.striker,
    false,
    []
  );

  assert.notEqual(result, null);
  const reflectedAngle = Math.atan2(result!.reflectedVy, result!.reflectedVx);
  assert.ok(reflectedAngle > bulletAngle + 0.1);
});

test('checkShieldDeflection supports Dual Shield gift powerup on opposite side', () => {
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

  // Primary shield faces PI (left), bullet arrives from 0 (right)
  const missed = checkShieldDeflection(
    bullet,
    cx,
    cy,
    orbitRadius,
    Math.PI,
    0,
    SHIELD_STANCES.brass,
    false,
    [],
    false
  );
  assert.equal(missed, null);

  // With Dual Shield gift active, secondary shield at PI + PI = 0 blocks it!
  const blocked = checkShieldDeflection(
    bullet,
    cx,
    cy,
    orbitRadius,
    Math.PI,
    0,
    SHIELD_STANCES.brass,
    false,
    [],
    true
  );
  assert.notEqual(blocked, null);
  assert.equal(blocked!.hit, true);
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
  const late = getInfinityDifficulty(90, 25);

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
