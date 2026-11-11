import React, { useEffect, useRef } from 'react';
import {
  BulletState,
  calculateKillScore,
  checkShieldDeflection,
  EnemyArchetype,
  EnemyState,
  getInfinityDifficulty,
  getLevelConfig,
  normalizeAngle,
  SHIELD_STANCES,
  ShieldStanceId,
  shortestAngleDiff,
  stepAngleTowards,
} from '../game/physics';
import {
  GameMode,
  InfinityGiftDrop,
  InfinityGiftType,
  PlayerLoadout,
} from '../game/catalog';
import { soundEngine } from '../game/audio';
import { HudSnapshot } from './GameHud';
import { RunSummarySnapshot } from './StatusModal';

export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

interface ArenaCanvasProps {
  gamePhase: GamePhase;
  gameMode: GameMode;
  selectedLevel: number;
  selectedStance: ShieldStanceId;
  loadout: PlayerLoadout;
  totalCoins: number;
  runNonce: number;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onAddCoins: (amount: number) => void;
  onLevelComplete: (completedLevel: number) => void;
  onGameOver: (summary: RunSummarySnapshot) => void;
  onTogglePause: () => void;
  onSelectStance: (stance: ShieldStanceId) => void;
}

const MAX_PARTICLES = 200;
interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const MAX_FLOATING_TEXTS = 24;
interface FloatingTextSlot {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

const SPRINKLE_COLORS = ['#F472B6', '#38BDF8', '#FDE047', '#4ADE80', '#A855F7', '#FB923C'];

export const ArenaCanvas: React.FC<ArenaCanvasProps> = ({
  gamePhase,
  gameMode,
  selectedLevel,
  selectedStance,
  loadout,
  totalCoins,
  runNonce,
  onHudUpdate,
  onAddCoins,
  onLevelComplete,
  onGameOver,
  onTogglePause,
  onSelectStance,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const phaseRef = useRef<GamePhase>(gamePhase);
  phaseRef.current = gamePhase;

  const modeRef = useRef<GameMode>(gameMode);
  modeRef.current = gameMode;

  const levelPropRef = useRef<number>(selectedLevel);
  levelPropRef.current = selectedLevel;

  const stanceRef = useRef<ShieldStanceId>(selectedStance);
  stanceRef.current = selectedStance;

  const loadoutRef = useRef<PlayerLoadout>(loadout);
  loadoutRef.current = loadout;

  const coinsRef = useRef<number>(totalCoins);
  coinsRef.current = totalCoins;

  const callbacksRef = useRef({
    onHudUpdate,
    onAddCoins,
    onLevelComplete,
    onGameOver,
    onTogglePause,
    onSelectStance,
  });
  callbacksRef.current = {
    onHudUpdate,
    onAddCoins,
    onLevelComplete,
    onGameOver,
    onTogglePause,
    onSelectStance,
  };

  const resetReqRef = useRef<number>(runNonce);
  useEffect(() => {
    resetReqRef.current = runNonce;
  }, [runNonce]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const updateCanvasSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };
    updateCanvasSize();

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    resizeObserver.observe(canvas);

    const particles: ParticleSlot[] = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.4,
      size: 3,
      color: '#F59E0B',
    }));
    let particleCursor = 0;

    const spawnParticles = (
      x: number,
      y: number,
      count: number,
      baseAngle: number,
      spread: number,
      speedMin: number,
      speedMax: number,
      color: string,
      size = 3.5,
      rainbowSprinkles = false
    ) => {
      for (let i = 0; i < count; i++) {
        const slot = particles[particleCursor];
        particleCursor = (particleCursor + 1) % MAX_PARTICLES;
        const angle = baseAngle + (Math.random() - 0.5) * spread;
        const speed = speedMin + Math.random() * (speedMax - speedMin);
        slot.active = true;
        slot.x = x;
        slot.y = y;
        slot.vx = Math.cos(angle) * speed;
        slot.vy = Math.sin(angle) * speed;
        slot.maxLife = 0.25 + Math.random() * 0.3;
        slot.life = slot.maxLife;
        slot.size = size * (0.75 + Math.random() * 0.5);
        slot.color = rainbowSprinkles
          ? SPRINKLE_COLORS[i % SPRINKLE_COLORS.length]
          : color;
      }
    };

    const floatingTexts: FloatingTextSlot[] = Array.from({ length: MAX_FLOATING_TEXTS }, () => ({
      active: false,
      x: 0,
      y: 0,
      vy: -40,
      text: '',
      color: '#FDE68A',
      life: 0,
      maxLife: 0.75,
    }));
    let floatCursor = 0;

    const spawnFloatingText = (x: number, y: number, text: string, color: string) => {
      const slot = floatingTexts[floatCursor];
      floatCursor = (floatCursor + 1) % MAX_FLOATING_TEXTS;
      slot.active = true;
      slot.x = x;
      slot.y = y;
      slot.vy = -48;
      slot.text = text;
      slot.color = color;
      slot.maxLife = 0.85;
      slot.life = 0.85;
    };

    const ORBIT_RADIUS = 72;
    const PLAYER_RADIUS = 23;

    let shieldAngle = 0;
    let targetShieldAngle = 0;
    let shieldAngularVel = 0;
    let useTargetAngleTracking = false;

    // Shield Ribbon Trail history (stores recent shield arc midpoint angles)
    const shieldAngleHistory: number[] = [];

    let isDragging = false;
    let lastDragX = 0;
    let lastDragY = 0;
    const keysPressed = new Set<string>();

    // Run Variables
    let hp = 5;
    const maxHp = 5;
    let crackedSocketIndex = -1;
    let crackedTimer = 0;
    let score = 0;
    let bestScore = Number(localStorage.getItem('orbit_deflect_best') || '0') || 0;
    let runCoinsEarned = 0;
    let combo = 1;
    let comboDecayTimer = 0;
    let currentLevel = 1;
    let infinityElapsed = 0;
    let spawnedInLevel = 0;
    let defeatedInLevel = 0;
    let totalDefeatedInRun = 0;
    let deflections = 0;
    let bankKills = 0;

    // Infinity Mode Gift Power-up Timers & Floating Gift Crates
    let dualShieldTimer = 0;
    let tripleWeaponTimer = 0;
    let giftDrops: InfinityGiftDrop[] = [];

    let hitstopTimer = 0;
    let cameraTrauma = 0;
    let playerHitFlashTimer = 0;
    let shieldRecoil = 0;
    let pulseActiveTimer = 0;
    let pulseCooldownTimer = 0;
    let defeatDelayTimer = 0;
    let pendingOutcome: 'victory' | 'defeat' | null = null;
    let animClock = 0;

    let nextEntityId = 1;
    let enemies: EnemyState[] = [];
    let bullets: BulletState[] = [];
    let spawnCooldown = 0.5;
    let globalShotStaggerTimer = 0;
    let demoShotTimer = 0.6;
    let lastAppliedResetNonce = -1;

    let lastHudKey = '';
    const pushHudSnapshot = () => {
      const isInfinity = modeRef.current === 'infinity';
      const levelCfg = getLevelConfig(currentLevel);
      const infDiff = getInfinityDifficulty(infinityElapsed, totalDefeatedInRun);
      const displayLevel = isInfinity ? infDiff.tier : currentLevel;
      const remaining = isInfinity
        ? 0
        : Math.max(0, levelCfg.totalEnemiesInLevel - defeatedInLevel);
      const crackedIdx = crackedTimer > 0 ? crackedSocketIndex : -1;
      const roundedPulse = Math.ceil(Math.max(0, pulseCooldownTimer) * 10) / 10;
      const roundedDual = Math.ceil(Math.max(0, dualShieldTimer) * 10) / 10;
      const roundedTriple = Math.ceil(Math.max(0, tripleWeaponTimer) * 10) / 10;

      const key = `${modeRef.current}|${hp}|${crackedIdx}|${score}|${bestScore}|${coinsRef.current}|${combo}|${displayLevel}|${remaining}|${deflections}|${roundedPulse}|${roundedDual}|${roundedTriple}|${stanceRef.current}|${soundEngine.muted}`;
      if (key === lastHudKey) return;
      lastHudKey = key;

      callbacksRef.current.onHudUpdate({
        gameMode: modeRef.current,
        hp,
        maxHp,
        crackedSocketIndex: crackedIdx,
        score,
        bestScore,
        coins: coinsRef.current,
        combo,
        level: displayLevel,
        enemiesRemaining: remaining,
        deflections,
        pulseCooldown: roundedPulse,
        dualShieldTimer: roundedDual,
        tripleWeaponTimer: roundedTriple,
        stance: stanceRef.current,
        muted: soundEngine.muted,
      });
    };

    const spawnEnemyAtAngle = (
      angle: number,
      archetype: EnemyArchetype,
      aimDuration: number,
      readyImmediately = false
    ) => {
      const cx = width * 0.5;
      const cy = height * 0.5;
      const arenaRadius = Math.min(width, height) * 0.42;
      const standoffFactor =
        archetype === 'bastion'
          ? 0.58
          : archetype === 'flanker'
            ? 0.76
            : archetype === 'burst'
              ? 0.82
              : 0.74;
      const standoffDist = Math.max(170, Math.min(340, arenaRadius * standoffFactor));
      const spawnDist = readyImmediately ? standoffDist : Math.max(width, height) * 0.54;

      const isBastion = archetype === 'bastion';
      enemies.push({
        id: nextEntityId++,
        archetype,
        x: cx + Math.cos(angle) * spawnDist,
        y: cy + Math.sin(angle) * spawnDist,
        vx: 0,
        vy: 0,
        radius: isBastion ? 22 : archetype === 'burst' ? 18 : 16,
        hp: isBastion ? 2 : 1,
        maxHp: isBastion ? 2 : 1,
        angleToCenter: angle,
        orbitDir: Math.random() < 0.5 ? 1 : -1,
        standoffDist,
        phase: readyImmediately ? 'aiming' : 'entering',
        phaseTimer: readyImmediately ? aimDuration : 0.35,
        aimDuration,
        burstRemaining: archetype === 'burst' ? 2 : 1,
        hitFlashTimer: 0,
        koTimer: 0,
        koVx: 0,
        koVy: 0,
      });
    };

    const spawnGiftDropAt = (x: number, y: number, cx: number, cy: number) => {
      const types: { type: InfinityGiftType; label: string; color: string }[] = [
        { type: 'dual_shield', label: '+DUAL SHIELD', color: '#10B981' },
        { type: 'extra_life', label: '+1 LIFE', color: '#F43F5E' },
        { type: 'triple_weapon', label: 'TRIPLE SHOT', color: '#38BDF8' },
      ];
      const chosen = types[Math.floor(Math.random() * types.length)];
      const angleToCenter = Math.atan2(cy - y, cx - x);
      const speed = 115;
      giftDrops.push({
        id: nextEntityId++,
        type: chosen.type,
        x,
        y,
        vx: Math.cos(angleToCenter) * speed,
        vy: Math.sin(angleToCenter) * speed,
        radius: 15,
        label: chosen.label,
        color: chosen.color,
      });
    };

    const resetRun = () => {
      hp = maxHp;
      crackedSocketIndex = -1;
      crackedTimer = 0;
      score = 0;
      runCoinsEarned = 0;
      combo = 1;
      comboDecayTimer = 0;
      currentLevel = levelPropRef.current;
      infinityElapsed = 0;
      spawnedInLevel = 0;
      defeatedInLevel = 0;
      totalDefeatedInRun = 0;
      deflections = 0;
      bankKills = 0;
      dualShieldTimer = 0;
      tripleWeaponTimer = 0;
      giftDrops = [];
      hitstopTimer = 0;
      cameraTrauma = 0;
      playerHitFlashTimer = 0;
      shieldRecoil = 0;
      pulseActiveTimer = 0;
      pulseCooldownTimer = 0;
      defeatDelayTimer = 0;
      pendingOutcome = null;
      enemies = [];
      bullets = [];
      shieldAngleHistory.length = 0;
      keysPressed.clear();
      isDragging = false;

      shieldAngle = 0;
      targetShieldAngle = 0;
      useTargetAngleTracking = false;

      const cfg = getLevelConfig(currentLevel);
      spawnEnemyAtAngle(0, 'marksman', cfg.aimTelegraphDuration, true);
      spawnEnemyAtAngle(-0.75, cfg.allowedArchetypes[1] ?? 'marksman', cfg.aimTelegraphDuration, false);
      spawnedInLevel = 2;
      spawnCooldown = 1.4;
      globalShotStaggerTimer = 0.4;
      lastHudKey = '';
      pushHudSnapshot();
    };

    resetRun();
    lastAppliedResetNonce = resetReqRef.current;

    const screenToWorld = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (phaseRef.current !== 'playing' && phaseRef.current !== 'title') return;
      isDragging = true;
      const pt = screenToWorld(e.clientX, e.clientY);
      lastDragX = pt.x;
      lastDragY = pt.y;
      const cx = width * 0.5;
      const cy = height * 0.5;
      if (Math.hypot(pt.x - cx, pt.y - cy) > 18) {
        targetShieldAngle = Math.atan2(pt.y - cy, pt.x - cx);
        useTargetAngleTracking = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (phaseRef.current !== 'playing' && phaseRef.current !== 'title') return;
      const pt = screenToWorld(e.clientX, e.clientY);
      const cx = width * 0.5;
      const cy = height * 0.5;

      const distFromCenter = Math.hypot(pt.x - cx, pt.y - cy);
      if (isDragging && pt.y > height * 0.68) {
        const dx = pt.x - lastDragX;
        targetShieldAngle = normalizeAngle(targetShieldAngle + dx * 0.014);
        useTargetAngleTracking = true;
      } else if (distFromCenter > 16) {
        targetShieldAngle = Math.atan2(pt.y - cy, pt.x - cx);
        useTargetAngleTracking = true;
      }
      lastDragX = pt.x;
      lastDragY = pt.y;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const triggerPulseParry = () => {
      if (phaseRef.current !== 'playing') return;
      if (pulseCooldownTimer <= 0) {
        pulseActiveTimer = 0.26;
        pulseCooldownTimer = 2.8;
        soundEngine.playPulseParry();
        const cx = width * 0.5;
        const cy = height * 0.5;
        spawnParticles(
          cx + Math.cos(shieldAngle) * ORBIT_RADIUS,
          cy + Math.sin(shieldAngle) * ORBIT_RADIUS,
          14,
          shieldAngle,
          1.4,
          90,
          240,
          '#34D399',
          4
        );
        pushHudSnapshot();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (phaseRef.current === 'playing') {
        if (code === 'Space') {
          e.preventDefault();
          if (!keysPressed.has(code)) {
            triggerPulseParry();
          }
        } else if (code === 'Digit1' || code === 'Numpad1') {
          callbacksRef.current.onSelectStance('brass');
        } else if (code === 'Digit2' || code === 'Numpad2') {
          callbacksRef.current.onSelectStance('striker');
        } else if (code === 'Digit3' || code === 'Numpad3') {
          callbacksRef.current.onSelectStance('prism');
        } else if (code === 'KeyM') {
          soundEngine.muted = !soundEngine.muted;
          pushHudSnapshot();
        }
      }
      if (
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'KeyA' ||
        code === 'KeyD'
      ) {
        useTargetAngleTracking = false;
      }
      keysPressed.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
    };

    const clearInputs = () => {
      keysPressed.clear();
      isDragging = false;
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);

    const onVisibilityChange = () => {
      if (document.hidden) clearInputs();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    let rafId = 0;
    let frameTimer = 0;
    let lastTime = performance.now();
    let hudSyncAccumulator = 0;

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      animClock += dt;

      if (resetReqRef.current !== lastAppliedResetNonce) {
        lastAppliedResetNonce = resetReqRef.current;
        resetRun();
      }

      const cx = width * 0.5;
      const cy = height * 0.5;
      const stance = SHIELD_STANCES[stanceRef.current];
      const activeLoadout = loadoutRef.current;

      cameraTrauma = Math.max(0, cameraTrauma - dt * 2.4);
      playerHitFlashTimer = Math.max(0, playerHitFlashTimer - dt);
      crackedTimer = Math.max(0, crackedTimer - dt);
      shieldRecoil *= Math.pow(0.001, dt);

      // Update pooled particles
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.94;
        p.vy *= 0.94;
      }

      // Update floating texts
      for (let i = 0; i < MAX_FLOATING_TEXTS; i++) {
        const ft = floatingTexts[i];
        if (!ft.active) continue;
        ft.life -= dt;
        if (ft.life <= 0) {
          ft.active = false;
          continue;
        }
        ft.y += ft.vy * dt;
      }

      if (phaseRef.current === 'title') {
        const prevAngle = shieldAngle;
        if (useTargetAngleTracking) {
          shieldAngle = stepAngleTowards(shieldAngle, targetShieldAngle, dt * 11.5);
        } else {
          shieldAngle = normalizeAngle(shieldAngle + dt * 1.15);
        }
        shieldAngularVel = shortestAngleDiff(prevAngle, shieldAngle) / dt;

        shieldAngleHistory.push(shieldAngle);
        if (shieldAngleHistory.length > 14) shieldAngleHistory.shift();

        demoShotTimer -= dt;
        if (demoShotTimer <= 0) {
          demoShotTimer = 1.25;
          const spawnAngle = shieldAngle + (Math.random() - 0.5) * 0.45;
          const dist = Math.min(width, height) * 0.38;
          const sx = cx + Math.cos(spawnAngle) * dist;
          const sy = cy + Math.sin(spawnAngle) * dist;
          const speed = 310;
          bullets.push({
            id: nextEntityId++,
            x: sx,
            y: sy,
            vx: -Math.cos(spawnAngle) * speed,
            vy: -Math.sin(spawnAngle) * speed,
            radius: 6,
            isDeflected: false,
            deflectCount: 0,
            pierceRemaining: 1,
            wallBouncesRemaining: 0,
            sourceEnemyId: 0,
            isPowerDeflect: false,
            color: '#F43F5E',
            spinAngle: 0,
            trail: [],
          });
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          b.trail.push({ x: b.x, y: b.y });
          if (b.trail.length > 9) b.trail.shift();
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.spinAngle += dt * 14;

          const deflect = checkShieldDeflection(
            b,
            cx,
            cy,
            ORBIT_RADIUS,
            shieldAngle,
            shieldAngularVel,
            stance,
            false,
            [],
            false
          );
          if (deflect) {
            b.isDeflected = true;
            b.x = deflect.impactX;
            b.y = deflect.impactY;
            b.vx = deflect.reflectedVx;
            b.vy = deflect.reflectedVy;
            b.color = stance.color;
            shieldRecoil = -6;
            spawnParticles(
              deflect.impactX,
              deflect.impactY,
              12,
              Math.atan2(deflect.reflectedVy, deflect.reflectedVx),
              0.9,
              120,
              280,
              stance.color,
              3.5,
              activeLoadout.shield === 'donut'
            );
          }

          const distToCenter = Math.hypot(b.x - cx, b.y - cy);
          if (
            (!b.isDeflected && distToCenter < ORBIT_RADIUS - 12) ||
            distToCenter > Math.max(width, height)
          ) {
            bullets.splice(i, 1);
          }
        }
      } else if (phaseRef.current === 'playing') {
        if (pendingOutcome !== null) {
          defeatDelayTimer -= dt;
          if (defeatDelayTimer <= 0) {
            const finalOutcome = pendingOutcome;
            pendingOutcome = null;
            const isInfinity = modeRef.current === 'infinity';
            const displayLvl = isInfinity
              ? getInfinityDifficulty(infinityElapsed, totalDefeatedInRun).tier
              : currentLevel;

            if (finalOutcome === 'victory' && !isInfinity) {
              callbacksRef.current.onLevelComplete(currentLevel);
            }

            callbacksRef.current.onGameOver({
              outcome: finalOutcome,
              gameMode: modeRef.current,
              score,
              bestScore,
              levelReached: displayLvl,
              coinsEarned: runCoinsEarned,
              deflections,
              bankKills,
            });
          }
        } else {
          const prevAngle = shieldAngle;
          const rotLeft = keysPressed.has('ArrowLeft') || keysPressed.has('KeyA');
          const rotRight = keysPressed.has('ArrowRight') || keysPressed.has('KeyD');
          const keyboardAngularSpeed = 6.8;

          if (rotLeft || rotRight) {
            const dir = (rotRight ? 1 : 0) - (rotLeft ? 1 : 0);
            shieldAngle = normalizeAngle(shieldAngle + dir * keyboardAngularSpeed * dt);
            targetShieldAngle = shieldAngle;
          } else if (useTargetAngleTracking) {
            shieldAngle = stepAngleTowards(shieldAngle, targetShieldAngle, dt * 16.5);
          }
          shieldAngularVel = shortestAngleDiff(prevAngle, shieldAngle) / dt;

          shieldAngleHistory.push(shieldAngle);
          if (shieldAngleHistory.length > 15) shieldAngleHistory.shift();

          if (hitstopTimer > 0) {
            hitstopTimer = Math.max(0, hitstopTimer - dt);
          } else {
            const simDt = dt;
            const isInfinity = modeRef.current === 'infinity';
            if (isInfinity) {
              infinityElapsed += simDt;
            }

            pulseActiveTimer = Math.max(0, pulseActiveTimer - simDt);
            pulseCooldownTimer = Math.max(0, pulseCooldownTimer - simDt);
            dualShieldTimer = Math.max(0, dualShieldTimer - simDt);
            tripleWeaponTimer = Math.max(0, tripleWeaponTimer - simDt);
            globalShotStaggerTimer = Math.max(0, globalShotStaggerTimer - simDt);

            if (combo > 1) {
              comboDecayTimer -= simDt;
              if (comboDecayTimer <= 0) {
                combo = 1;
                pushHudSnapshot();
              }
            }

            const levelCfg = getLevelConfig(currentLevel);
            const infDiff = getInfinityDifficulty(infinityElapsed, totalDefeatedInRun);

            const maxConcurrentEnemies = isInfinity
              ? infDiff.maxConcurrentEnemies
              : levelCfg.maxConcurrentEnemies;
            const maxConcurrentAttackers = isInfinity
              ? infDiff.maxConcurrentAttackers
              : levelCfg.maxConcurrentAttackers;
            const bulletSpeed = isInfinity ? infDiff.bulletSpeed : levelCfg.bulletSpeed;
            const aimTelegraphDuration = isInfinity
              ? infDiff.aimTelegraphDuration
              : levelCfg.aimTelegraphDuration;
            const staggerDelay = isInfinity
              ? infDiff.staggerDelayBetweenShots
              : levelCfg.staggerDelayBetweenShots;
            const allowedArchetypes = isInfinity
              ? infDiff.allowedArchetypes
              : levelCfg.allowedArchetypes;

            // Spawn Enemies
            const activeEnemies = enemies.filter((e) => e.phase !== 'ko');
            spawnCooldown -= simDt;
            const canSpawnMore = isInfinity || spawnedInLevel < levelCfg.totalEnemiesInLevel;

            if (
              canSpawnMore &&
              activeEnemies.length < maxConcurrentEnemies &&
              spawnCooldown <= 0
            ) {
              let candidateAngle = 0;
              let bestMinDist = -1;
              for (let attempt = 0; attempt < 10; attempt++) {
                const testAngle = normalizeAngle((Math.random() * 2 - 1) * Math.PI);
                let minAngularSep = Math.PI * 2;
                for (const other of activeEnemies) {
                  const sep = Math.abs(shortestAngleDiff(testAngle, other.angleToCenter));
                  if (sep < minAngularSep) minAngularSep = sep;
                }
                if (minAngularSep > bestMinDist) {
                  bestMinDist = minAngularSep;
                  candidateAngle = testAngle;
                }
              }

              const chosenArchetype =
                allowedArchetypes[spawnedInLevel % allowedArchetypes.length];
              spawnEnemyAtAngle(candidateAngle, chosenArchetype, aimTelegraphDuration, false);
              spawnedInLevel++;
              const tierFactor = isInfinity ? infDiff.tier : currentLevel;
              spawnCooldown = tierFactor === 1 ? 1.35 : Math.max(0.52, 1.2 - tierFactor * 0.05);
            }

            // Update Floating Gift Drops in Infinity Mode
            for (let gIdx = giftDrops.length - 1; gIdx >= 0; gIdx--) {
              const g = giftDrops[gIdx];
              g.x += g.vx * simDt;
              g.y += g.vy * simDt;

              const distToCenter = Math.hypot(g.x - cx, g.y - cy);
              // Collect gift if it touches either the shield orbit ring or the center character
              if (distToCenter <= ORBIT_RADIUS + g.radius + 8) {
                soundEngine.playGiftPickup();
                if (g.type === 'dual_shield') {
                  dualShieldTimer = 12.0;
                  spawnFloatingText(g.x, g.y - 12, 'GIFT: DUAL SHIELD (12s)!', '#34D399');
                } else if (g.type === 'extra_life') {
                  hp = Math.min(maxHp, hp + 1);
                  spawnFloatingText(g.x, g.y - 12, 'GIFT: +1 LIFE!', '#FCA5A5');
                } else if (g.type === 'triple_weapon') {
                  tripleWeaponTimer = 10.0;
                  spawnFloatingText(g.x, g.y - 12, 'GIFT: TRIPLE RICOCHET (10s)!', '#38BDF8');
                }
                spawnParticles(g.x, g.y, 16, 0, Math.PI * 2, 80, 220, g.color, 4, true);
                giftDrops.splice(gIdx, 1);
                pushHudSnapshot();
              }
            }

            let currentAttackers = 0;
            for (const e of enemies) {
              if (e.phase === 'aiming' || e.phase === 'firing') {
                currentAttackers++;
              }
            }

            // Update Enemies
            for (let i = enemies.length - 1; i >= 0; i--) {
              const e = enemies[i];
              e.hitFlashTimer = Math.max(0, e.hitFlashTimer - simDt);

              if (e.phase === 'ko') {
                e.koTimer -= simDt;
                e.x += e.koVx * simDt;
                e.y += e.koVy * simDt;
                e.koVx *= 0.92;
                e.koVy *= 0.92;
                if (e.koTimer <= 0) {
                  enemies.splice(i, 1);
                }
                continue;
              }

              const dx = e.x - cx;
              const dy = e.y - cy;
              const dist = Math.hypot(dx, dy);
              e.angleToCenter = Math.atan2(dy, dx);

              if (e.phase === 'entering') {
                const moveSpeed = e.archetype === 'bastion' ? 145 : 220;
                if (dist > e.standoffDist + 8) {
                  e.vx = -Math.cos(e.angleToCenter) * moveSpeed;
                  e.vy = -Math.sin(e.angleToCenter) * moveSpeed;
                  e.x += e.vx * simDt;
                  e.y += e.vy * simDt;
                } else {
                  e.phase = 'positioning';
                  e.phaseTimer = 0.32 + Math.random() * 0.3;
                }
              } else if (e.phase === 'positioning') {
                if (e.archetype === 'flanker') {
                  const tangentAngle = e.angleToCenter + (Math.PI / 2) * e.orbitDir;
                  const orbitSpeed = 95;
                  e.x += Math.cos(tangentAngle) * orbitSpeed * simDt;
                  e.y += Math.sin(tangentAngle) * orbitSpeed * simDt;
                  const newAngle = Math.atan2(e.y - cy, e.x - cx);
                  e.x = cx + Math.cos(newAngle) * e.standoffDist;
                  e.y = cy + Math.sin(newAngle) * e.standoffDist;
                  e.angleToCenter = newAngle;
                } else if (e.archetype === 'bastion') {
                  if (dist > ORBIT_RADIUS + 105) {
                    e.x -= Math.cos(e.angleToCenter) * 28 * simDt;
                    e.y -= Math.sin(e.angleToCenter) * 28 * simDt;
                  }
                }

                e.phaseTimer -= simDt;
                if (
                  e.phaseTimer <= 0 &&
                  currentAttackers < maxConcurrentAttackers &&
                  globalShotStaggerTimer <= 0
                ) {
                  e.phase = 'aiming';
                  e.phaseTimer = aimTelegraphDuration;
                  e.aimDuration = aimTelegraphDuration;
                  e.burstRemaining = e.archetype === 'burst' ? 2 : 1;
                  currentAttackers++;
                  globalShotStaggerTimer = staggerDelay;
                  soundEngine.playAimTelegraph();
                }
              } else if (e.phase === 'aiming') {
                e.phaseTimer -= simDt;
                if (e.phaseTimer <= 0) {
                  e.phase = 'firing';
                  e.phaseTimer = 0.05;
                }
              } else if (e.phase === 'firing') {
                const aimAngle = Math.atan2(cy - e.y, cx - e.x);
                const spreadOffset =
                  e.archetype === 'burst' ? (e.burstRemaining === 2 ? -0.05 : 0.05) : 0;
                const shotAngle = aimAngle + spreadOffset;
                const bSpeed =
                  e.archetype === 'bastion'
                    ? bulletSpeed * 0.88
                    : e.archetype === 'flanker'
                      ? bulletSpeed * 1.08
                      : bulletSpeed;

                bullets.push({
                  id: nextEntityId++,
                  x: e.x + Math.cos(shotAngle) * (e.radius + 6),
                  y: e.y + Math.sin(shotAngle) * (e.radius + 6),
                  vx: Math.cos(shotAngle) * bSpeed,
                  vy: Math.sin(shotAngle) * bSpeed,
                  radius: e.archetype === 'bastion' ? 8.5 : 6.5,
                  isDeflected: false,
                  deflectCount: 0,
                  pierceRemaining: 1,
                  wallBouncesRemaining: 0,
                  sourceEnemyId: e.id,
                  isPowerDeflect: false,
                  color:
                    e.archetype === 'bastion'
                      ? '#10B981'
                      : e.archetype === 'burst'
                        ? '#A855F7'
                        : e.archetype === 'flanker'
                          ? '#F59E0B'
                          : '#F43F5E',
                  spinAngle: 0,
                  trail: [],
                });

                soundEngine.playEnemyShoot(e.archetype);
                e.burstRemaining--;
                if (e.burstRemaining > 0) {
                  e.phase = 'aiming';
                  e.phaseTimer = 0.28;
                  e.aimDuration = 0.28;
                } else {
                  e.phase = 'recovering';
                  e.phaseTimer = Math.max(0.6, 1.05 - currentLevel * 0.03);
                }
              } else if (e.phase === 'recovering') {
                e.phaseTimer -= simDt;
                if (e.phaseTimer <= 0) {
                  e.phase = 'positioning';
                  e.phaseTimer = 0.32;
                }
              }
            }

            // Update Bullets
            for (let i = bullets.length - 1; i >= 0; i--) {
              const b = bullets[i];
              b.trail.push({ x: b.x, y: b.y });
              if (b.trail.length > 10) b.trail.shift();
              b.spinAngle += simDt * 15;

              const subSteps = 2;
              let bulletRemoved = false;

              for (let s = 0; s < subSteps; s++) {
                b.x += (b.vx * simDt) / subSteps;
                b.y += (b.vy * simDt) / subSteps;

                if (!b.isDeflected) {
                  const deflect = checkShieldDeflection(
                    b,
                    cx,
                    cy,
                    ORBIT_RADIUS,
                    shieldAngle,
                    shieldAngularVel,
                    stance,
                    pulseActiveTimer > 0,
                    enemies,
                    dualShieldTimer > 0
                  );

                  if (deflect) {
                    const isPower =
                      pulseActiveTimer > 0 || Math.abs(shieldAngularVel) > 4.2;
                    b.isDeflected = true;
                    b.deflectCount++;
                    b.x = deflect.impactX;
                    b.y = deflect.impactY;
                    b.vx = deflect.reflectedVx;
                    b.vy = deflect.reflectedVy;
                    b.pierceRemaining = stance.pierceCount;
                    b.wallBouncesRemaining = stance.wallBounces;
                    b.isPowerDeflect = isPower;
                    b.color = stance.color;

                    deflections++;
                    combo = Math.min(16, combo + 1);
                    comboDecayTimer = 4.2;
                    score += 25 * combo;
                    if (score > bestScore) {
                      bestScore = score;
                      localStorage.setItem('orbit_deflect_best', String(bestScore));
                    }

                    hitstopTimer = isPower ? 0.045 : 0.028;
                    cameraTrauma = Math.min(1, cameraTrauma + (isPower ? 0.32 : 0.18));
                    shieldRecoil = -7.5;
                    soundEngine.playDeflect(
                      isPower,
                      combo,
                      activeLoadout.shield,
                      activeLoadout.projectile
                    );

                    const outAngle = Math.atan2(b.vy, b.vx);

                    // Skin-specific impact particles (Donut sprinkles, Flaming Arrow fire, Tomato splat)
                    const isDonut = activeLoadout.shield === 'donut';
                    const isFireArrow = activeLoadout.projectile === 'arrow';
                    const isTomato = activeLoadout.projectile === 'tomato';
                    const pColor = isTomato
                      ? '#EF4444'
                      : isFireArrow
                        ? '#F97316'
                        : stance.accentColor;

                    spawnParticles(
                      b.x,
                      b.y,
                      isDonut || isTomato ? 20 : 12,
                      outAngle,
                      1.2,
                      130,
                      340,
                      pColor,
                      isDonut || isTomato ? 4.4 : 3.4,
                      isDonut
                    );

                    if (activeLoadout.shield === 'pan') {
                      spawnFloatingText(b.x, b.y - 14, 'TING!', '#FDE047');
                    }

                    // Split into extra bolts if Trishul Prism stance OR Triple Weapon Gift is active!
                    if (stance.splitBullets || tripleWeaponTimer > 0) {
                      const speed = Math.hypot(b.vx, b.vy);
                      const angles =
                        tripleWeaponTimer > 0
                          ? [outAngle - 0.22, outAngle + 0.22]
                          : [outAngle + 0.18];
                      if (tripleWeaponTimer === 0) {
                        b.vx = Math.cos(outAngle - 0.18) * speed;
                        b.vy = Math.sin(outAngle - 0.18) * speed;
                      }
                      for (const extraAngle of angles) {
                        bullets.push({
                          id: nextEntityId++,
                          x: b.x,
                          y: b.y,
                          vx: Math.cos(extraAngle) * speed,
                          vy: Math.sin(extraAngle) * speed,
                          radius: b.radius * 0.9,
                          isDeflected: true,
                          deflectCount: 1,
                          pierceRemaining: 1,
                          wallBouncesRemaining: stance.wallBounces,
                          sourceEnemyId: b.sourceEnemyId,
                          isPowerDeflect: isPower,
                          color: '#38BDF8',
                          spinAngle: 0,
                          trail: [{ x: b.x, y: b.y }],
                        });
                      }
                    }

                    pushHudSnapshot();
                    break;
                  }

                  // Check if undeflected bullet hits the center player character
                  const distToPlayer = Math.hypot(b.x - cx, b.y - cy);
                  if (distToPlayer < PLAYER_RADIUS + b.radius - 2) {
                    bullets.splice(i, 1);
                    bulletRemoved = true;

                    hp = Math.max(0, hp - 1);
                    crackedSocketIndex = hp;
                    crackedTimer = 1.6;
                    combo = 1;
                    hitstopTimer = 0.065;
                    cameraTrauma = Math.min(1, cameraTrauma + 0.65);
                    playerHitFlashTimer = 0.28;
                    soundEngine.playPlayerHurt();
                    spawnParticles(cx, cy, 24, 0, Math.PI * 2, 80, 290, '#F43F5E', 4.5);
                    pushHudSnapshot();

                    if (hp <= 0 && pendingOutcome === null) {
                      pendingOutcome = 'defeat';
                      defeatDelayTimer = 0.48;
                    }
                    break;
                  }
                } else {
                  // Deflected bullet vs Enemies
                  for (const enemy of enemies) {
                    if (enemy.phase === 'ko') continue;
                    const distToEnemy = Math.hypot(b.x - enemy.x, b.y - enemy.y);
                    if (distToEnemy <= enemy.radius + b.radius + 6) {
                      const damage = b.isPowerDeflect ? 2 : 1;
                      enemy.hp -= damage;
                      enemy.hitFlashTimer = 0.08;

                      const isBank = enemy.id !== b.sourceEnemyId || b.deflectCount > 1;
                      const hitAngle = Math.atan2(b.vy, b.vx);

                      if (enemy.hp <= 0) {
                        enemy.phase = 'ko';
                        enemy.koTimer = 0.32;
                        enemy.koVx = Math.cos(hitAngle) * 240;
                        enemy.koVy = Math.sin(hitAngle) * 240;
                        defeatedInLevel++;
                        totalDefeatedInRun++;
                        if (isBank) bankKills++;

                        const killPts = calculateKillScore(
                          enemy.archetype,
                          combo,
                          isBank,
                          b.isPowerDeflect
                        );
                        score += killPts;
                        if (score > bestScore) {
                          bestScore = score;
                          localStorage.setItem('orbit_deflect_best', String(bestScore));
                        }

                        // Award Coins for every enemy kill!
                        const coinGain = isBank ? 12 : 8;
                        runCoinsEarned += coinGain;
                        callbacksRef.current.onAddCoins(coinGain);

                        // In Infinity Mode, drop a Gift crate every 4 kills!
                        if (isInfinity && totalDefeatedInRun % 4 === 0) {
                          spawnGiftDropAt(enemy.x, enemy.y, cx, cy);
                        }

                        hitstopTimer = 0.048;
                        cameraTrauma = Math.min(1, cameraTrauma + 0.36);
                        soundEngine.playEnemyKill(isBank);

                        const splatColor =
                          activeLoadout.projectile === 'tomato'
                            ? '#EF4444'
                            : activeLoadout.projectile === 'arrow'
                              ? '#F97316'
                              : isBank
                                ? '#34D399'
                                : '#F59E0B';

                        spawnParticles(
                          enemy.x,
                          enemy.y,
                          22,
                          hitAngle,
                          Math.PI * 1.4,
                          90,
                          320,
                          splatColor,
                          4.2
                        );
                        spawnFloatingText(
                          enemy.x,
                          enemy.y - 18,
                          `+${killPts} · +${coinGain}c`,
                          '#FDE68A'
                        );
                      } else {
                        soundEngine.playDeflect(
                          false,
                          combo,
                          activeLoadout.shield,
                          activeLoadout.projectile
                        );
                        spawnParticles(
                          enemy.x,
                          enemy.y,
                          12,
                          hitAngle + Math.PI,
                          1.2,
                          80,
                          200,
                          '#10B981'
                        );
                      }

                      b.pierceRemaining--;
                      pushHudSnapshot();

                      if (b.pierceRemaining <= 0) {
                        bullets.splice(i, 1);
                        bulletRemoved = true;
                        break;
                      }
                    }
                  }
                  if (bulletRemoved) break;
                }
              }

              if (bulletRemoved) continue;

              const margin = 24;
              if (b.isDeflected && b.wallBouncesRemaining > 0) {
                let bouncedWall = false;
                if (b.x < margin || b.x > width - margin) {
                  b.vx = -b.vx;
                  b.x = Math.max(margin, Math.min(width - margin, b.x));
                  bouncedWall = true;
                }
                if (b.y < margin || b.y > height - margin) {
                  b.vy = -b.vy;
                  b.y = Math.max(margin, Math.min(height - margin, b.y));
                  bouncedWall = true;
                }
                if (bouncedWall) {
                  b.wallBouncesRemaining--;
                  b.deflectCount++;
                  spawnParticles(b.x, b.y, 8, Math.atan2(b.vy, b.vx), 0.9, 70, 180, b.color, 3);
                }
              }

              if (b.x < -80 || b.x > width + 80 || b.y < -80 || b.y > height + 80) {
                bullets.splice(i, 1);
              }
            }

            // Check Level Mode Victory (Fixed Enemies Cleared)
            if (
              !isInfinity &&
              pendingOutcome === null &&
              defeatedInLevel >= levelCfg.totalEnemiesInLevel &&
              enemies.filter((e) => e.phase !== 'ko').length === 0
            ) {
              runCoinsEarned += levelCfg.coinReward;
              callbacksRef.current.onAddCoins(levelCfg.coinReward);
              soundEngine.playWaveClear();
              spawnFloatingText(
                cx,
                cy - 90,
                `LEVEL ${currentLevel} CLEAR! +${levelCfg.coinReward} COINS`,
                '#FDE047'
              );
              pendingOutcome = 'victory';
              defeatDelayTimer = 0.55;
              pushHudSnapshot();
            }
          }
        }
      }

      hudSyncAccumulator += dt;
      if (hudSyncAccumulator >= 0.15) {
        hudSyncAccumulator = 0;
        if (phaseRef.current === 'playing') {
          pushHudSnapshot();
        }
      }

      // ========================================================================
      // RENDER ARENA & SKINS
      // ========================================================================
      ctx.save();
      ctx.scale(dpr, dpr);

      const shakeMag = cameraTrauma * cameraTrauma * 14;
      const shakeX = (Math.random() * 2 - 1) * shakeMag;
      const shakeY = (Math.random() * 2 - 1) * shakeMag;
      ctx.translate(shakeX, shakeY);

      // 1. Arena Floor
      ctx.fillStyle = '#0B0F17';
      ctx.fillRect(-20, -20, width + 40, height + 40);

      const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(width, height) * 0.55);
      bgGrad.addColorStop(0, 'rgba(30, 41, 59, 0.55)');
      bgGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.30)');
      bgGrad.addColorStop(1, 'rgba(7, 10, 16, 0.95)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Arena Rings & Carrom Pockets
      const outerArenaR = Math.min(width, height) * 0.42;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, outerArenaR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, outerArenaR * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      for (let k = 0; k < 4; k++) {
        const pocketAngle = Math.PI / 4 + (k * Math.PI) / 2;
        const px = cx + Math.cos(pocketAngle) * outerArenaR;
        const py = cy + Math.sin(pocketAngle) * outerArenaR;
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.42)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // 3. Orbit Track Ring
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, ORBIT_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 4. Enemy Aim Telegraphs & Ricochet Sight Line
      for (const e of enemies) {
        if (e.phase === 'aiming') {
          const progress = 1 - Math.max(0, e.phaseTimer / Math.max(0.01, e.aimDuration));
          const aimAngle = Math.atan2(cy - e.y, cx - e.x);

          ctx.save();
          ctx.strokeStyle =
            progress > 0.75 ? 'rgba(244, 63, 94, 0.85)' : 'rgba(245, 158, 11, 0.45)';
          ctx.lineWidth = 1.5 + progress * 1.5;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          const interceptX = cx - Math.cos(aimAngle) * ORBIT_RADIUS;
          const interceptY = cy - Math.sin(aimAngle) * ORBIT_RADIUS;
          ctx.lineTo(interceptX, interceptY);
          ctx.stroke();
          ctx.setLineDash([]);

          const virtualBullet = {
            x: interceptX,
            y: interceptY,
            vx: Math.cos(aimAngle) * 320,
            vy: Math.sin(aimAngle) * 320,
            radius: 6,
            isDeflected: false,
          };
          const predictedBounce = checkShieldDeflection(
            virtualBullet,
            cx,
            cy,
            ORBIT_RADIUS,
            shieldAngle,
            0,
            stance,
            pulseActiveTimer > 0,
            enemies,
            dualShieldTimer > 0
          );
          if (predictedBounce) {
            const bounceAngle = Math.atan2(
              predictedBounce.reflectedVy,
              predictedBounce.reflectedVx
            );
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(interceptX, interceptY);
            ctx.lineTo(
              interceptX + Math.cos(bounceAngle) * 260,
              interceptY + Math.sin(bounceAngle) * 260
            );
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.restore();
        }
      }

      // 5. Render Central Character Skin (Secret Agent, Monk, Wizard, Astronaut, DJ)
      ctx.save();
      const charSkin = activeLoadout.character;
      const floatOffset = charSkin === 'wizard' ? Math.sin(animClock * 4.5) * 4.5 : 0;
      ctx.translate(cx, cy + floatOffset);

      if (charSkin === 'wizard') {
        // Levitation shadow & magic ring underneath
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 18 - floatOffset, 22, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (charSkin === 'agent') {
        // Secret Agent: Black suit, white shirt & red tie, black sunglasses
        ctx.fillStyle = playerHitFlashTimer > 0 ? '#FFFFFF' : '#0F172A';
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // White Shirt V-Neck & Red Tie
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.moveTo(-7, 8);
        ctx.lineTo(0, 20);
        ctx.lineTo(7, 8);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#EF4444';
        ctx.fillRect(-2, 9, 4, 10);

        // Sunglasses
        ctx.fillStyle = '#020617';
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1.2;
        ctx.fillRect(-13, -7, 11, 7);
        ctx.strokeRect(-13, -7, 11, 7);
        ctx.fillRect(2, -7, 11, 7);
        ctx.strokeRect(2, -7, 11, 7);
      } else if (charSkin === 'monk') {
        // Ninja / Monk meditating in lotus mudra
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, PLAYER_RADIUS + 8, animClock, animClock + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#78350F';
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Red Headband
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, PLAYER_RADIUS - 2, -Math.PI * 0.85, -Math.PI * 0.15);
        ctx.stroke();

        // Peaceful closed meditation eyes
        ctx.strokeStyle = '#FEF3C7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-7, -1, 4, 0.2, Math.PI - 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(7, -1, 4, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else if (charSkin === 'wizard') {
        // Wizard floating with pointed arcane hat
        ctx.fillStyle = '#3B0764';
        ctx.strokeStyle = '#C084FC';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 2, PLAYER_RADIUS - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pointed Hat
        ctx.fillStyle = '#581C87';
        ctx.beginPath();
        ctx.moveTo(-18, -4);
        ctx.lineTo(0, -28);
        ctx.lineTo(18, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing Arcane Eyes
        ctx.fillStyle = '#FDE047';
        ctx.beginPath();
        ctx.arc(-6, 3, 3, 0, Math.PI * 2);
        ctx.arc(6, 3, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (charSkin === 'astronaut') {
        // Astronaut in white spacesuit & reflective gold visor
        ctx.fillStyle = '#F1F5F9';
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Gold Visor
        ctx.fillStyle = '#F59E0B';
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-14, -10, 28, 18, 8);
        ctx.fill();
        ctx.stroke();

        // Visor Glint
        ctx.strokeStyle = '#FEF3C7';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-9, -5);
        ctx.lineTo(4, -5);
        ctx.stroke();
      } else if (charSkin === 'dj') {
        // DJ spinning turntable deck with pulsing equalizer ring
        const beatPulse = 1 + Math.sin(animClock * 12) * 0.12;
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, PLAYER_RADIUS * beatPulse + 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#EC4899';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Headphones arc & earcups
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(-PLAYER_RADIUS - 3, -7, 5, 14);
        ctx.fillRect(PLAYER_RADIUS - 2, -7, 5, 14);

        // Mini spinning record on deck
        ctx.rotate(animClock * 5);
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 6. Render Shield Ribbon Trail (Silver, Red, Blue, Rainbow)
      const effectiveRadius = ORBIT_RADIUS + shieldRecoil;
      const trailSkin = activeLoadout.trail;
      if (shieldAngleHistory.length > 2) {
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 1; i < shieldAngleHistory.length; i++) {
          const prevA = shieldAngleHistory[i - 1];
          const currA = shieldAngleHistory[i];
          if (Math.abs(shortestAngleDiff(prevA, currA)) < 0.005) continue;

          const ratio = i / shieldAngleHistory.length;
          ctx.globalAlpha = ratio * 0.65;
          ctx.lineWidth = ratio * 9;

          if (trailSkin === 'rainbow') {
            const hue = Math.floor((animClock * 180 + i * 24) % 360);
            ctx.strokeStyle = `hsl(${hue}, 92%, 60%)`;
          } else if (trailSkin === 'red') {
            ctx.strokeStyle = '#F43F5E';
          } else if (trailSkin === 'blue') {
            ctx.strokeStyle = '#38BDF8';
          } else {
            ctx.strokeStyle = '#94A3B8';
          }

          ctx.beginPath();
          ctx.moveTo(
            cx + Math.cos(prevA) * effectiveRadius,
            cy + Math.sin(prevA) * effectiveRadius
          );
          ctx.lineTo(
            cx + Math.cos(currA) * effectiveRadius,
            cy + Math.sin(currA) * effectiveRadius
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      // 7. Render the Orbiting Shield Skin (Iron, Cast Iron Pan, Lightsaber, Rune Wall, Vinyl, Giant Donut)
      // Also renders the opposite-side Dual Shield if the gift buff is active!
      const shieldAnglesToRender =
        dualShieldTimer > 0
          ? [shieldAngle, normalizeAngle(shieldAngle + Math.PI)]
          : [shieldAngle];

      const halfArc = (stance.arcSpan * (pulseActiveTimer > 0 ? 1.35 : 1.0)) * 0.5;
      const shieldSkin = activeLoadout.shield;

      for (const sAngle of shieldAnglesToRender) {
        const startArc = sAngle - halfArc;
        const endArc = sAngle + halfArc;

        ctx.save();
        if (shieldSkin === 'pan') {
          // Cast Iron Frying Pan: Matte skillet body + iron handle extending tangentially
          ctx.strokeStyle = '#090D16';
          ctx.lineWidth = 18;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(cx, cy, effectiveRadius, startArc, endArc);
          ctx.stroke();

          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.arc(cx, cy, effectiveRadius, startArc, endArc);
          ctx.stroke();

          // Skillet handle sticking out at endArc
          const hx = cx + Math.cos(endArc) * effectiveRadius;
          const hy = cy + Math.sin(endArc) * effectiveRadius;
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(
            hx + Math.cos(endArc + 1.2) * 18,
            hy + Math.sin(endArc + 1.2) * 18
          );
          ctx.stroke();
        } else if (shieldSkin === 'lightsaber') {
          // Lightsaber: Intense neon outer glow + white plasma core + metallic hilt
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.lineWidth = 20;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(cx, cy, effectiveRadius, startArc, endArc);
          ctx.stroke();

          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.arc(cx, cy, effectiveRadius, startArc, endArc);
          ctx.stroke();

          ctx.strokeStyle = '#ECFDF5';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(cx, cy, effectiveRadius, startArc, endArc);
          ctx.stroke();
        } else if (shieldSkin === 'rune') {
          // Magical Rune Wall: Translucent cyan barrier with geometric rune dashes
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
          ctx.lineWidth = 16;
          ctx.lineCap = 'butt';
          ctx.beginPath();
          ctx.arc(cx, cy, effectiveRadius, startArc, endArc);
          ctx.stroke();

          ctx.strokeStyle = '#BAE6FD';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 5]);
          ctx.beginPath();
          ctx.arc(cx, cy, effectiveRadius, startArc, endArc);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (shieldSkin === 'vinyl') {
          // Vinyl Record Disc Arc: Grooved black LP with crimson center label
          ctx.strokeStyle = '#090D16';
          ctx.lineWidth = 16;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(cx, cy, effectiveRadius, startArc, endArc);
          ctx.stroke();

          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, effectiveRadius - 3, startArc, endArc);
          ctx.arc(cx, cy, effectiveRadius + 3, startArc, endArc);
          ctx.stroke();

          ctx.strokeStyle = '#F43F5E';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(cx, cy, effectiveRadius, sAngle - halfArc * 0.3, sAngle + halfArc * 0.3);
          ctx.stroke();
        } else if (shieldSkin === 'donut') {
          // Giant Donut: Golden dough base + pink glaze frosting + rainbow sprinkles
          ctx.strokeStyle = '#FBBF24';
          ctx.lineWidth = 16;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(cx, cy, effectiveRadius, startArc, endArc);
          ctx.stroke();

          ctx.strokeStyle = '#F472B6';
          ctx.lineWidth = 11;
          ctx.beginPath();
          ctx.arc(cx, cy, effectiveRadius, startArc, endArc);
          ctx.stroke();

          for (let sp = -2; sp <= 2; sp++) {
            const spAngle = sAngle + sp * (halfArc * 0.38);
            const sx = cx + Math.cos(spAngle) * effectiveRadius;
            const sy = cy + Math.sin(spAngle) * effectiveRadius;
            ctx.fillStyle = SPRINKLE_COLORS[(sp + 2) % SPRINKLE_COLORS.length];
            ctx.beginPath();
            ctx.arc(sx, sy, 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Default Iron / Brass Shield
          ctx.strokeStyle = '#070A10';
          ctx.lineWidth = 16;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(cx, cy, effectiveRadius, startArc, endArc);
          ctx.stroke();

          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.arc(cx, cy, effectiveRadius, startArc, endArc);
          ctx.stroke();

          ctx.strokeStyle = '#F8FAFC';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(
            cx,
            cy,
            effectiveRadius + 1.5,
            sAngle - halfArc * 0.45,
            sAngle + halfArc * 0.45
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      // 8. Render Infinity Mode Floating Gift Crates
      for (const g of giftDrops) {
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = g.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-12, -12, 24, 24, 5);
        ctx.fill();
        ctx.stroke();

        // Gift Ribbon Cross
        ctx.strokeStyle = '#F8FAFC';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(12, 0);
        ctx.moveTo(0, -12);
        ctx.lineTo(0, 12);
        ctx.stroke();
        ctx.restore();
      }

      // 9. Render Enemies
      for (const e of enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);
        const faceAngle = Math.atan2(cy - e.y, cx - e.x);
        ctx.rotate(faceAngle);

        if (e.phase === 'ko') {
          ctx.globalAlpha = Math.max(0, e.koTimer / 0.32);
          ctx.rotate((1 - e.koTimer / 0.32) * 4);
        }

        const isFlash = e.hitFlashTimer > 0;

        if (e.phase === 'aiming') {
          const p = 1 - Math.max(0, e.phaseTimer / Math.max(0.01, e.aimDuration));
          ctx.strokeStyle = p > 0.7 ? '#F43F5E' : '#F59E0B';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, e.radius + 4 + (1 - p) * 10, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = isFlash
          ? '#FFFFFF'
          : e.archetype === 'bastion'
            ? '#065F46'
            : e.archetype === 'burst'
              ? '#581C87'
              : e.archetype === 'flanker'
                ? '#78350F'
                : '#881337';
        ctx.strokeStyle = isFlash
          ? '#FFFFFF'
          : e.archetype === 'bastion'
            ? '#34D399'
            : e.archetype === 'burst'
              ? '#C084FC'
              : e.archetype === 'flanker'
                ? '#FBBF24'
                : '#FB7185';
        ctx.lineWidth = 2.5;

        if (e.archetype === 'bastion') {
          ctx.beginPath();
          for (let v = 0; v < 6; v++) {
            const a = (v * Math.PI) / 3;
            const vx = Math.cos(a) * e.radius;
            const vy = Math.sin(a) * e.radius;
            if (v === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (e.archetype === 'flanker') {
          ctx.beginPath();
          ctx.moveTo(e.radius + 4, 0);
          ctx.lineTo(-e.radius, -e.radius * 0.9);
          ctx.lineTo(-e.radius * 0.45, 0);
          ctx.lineTo(-e.radius, e.radius * 0.9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (e.archetype === 'burst') {
          ctx.beginPath();
          ctx.moveTo(e.radius + 2, -5);
          ctx.lineTo(e.radius + 2, 5);
          ctx.lineTo(-2, e.radius);
          ctx.lineTo(-e.radius, 0);
          ctx.lineTo(-2, -e.radius);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fillRect(6, -3.5, e.radius + 4, 7);
        }

        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.arc(2, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 10. Render Projectile Skins (Sniper Bullets, Flaming Arrows, Ninja Shurikens, Laser Beams, Rotten Tomatoes)
      const projSkin = activeLoadout.projectile;
      for (const b of bullets) {
        if (b.trail.length > 1) {
          ctx.save();
          ctx.strokeStyle =
            projSkin === 'arrow'
              ? '#F97316'
              : projSkin === 'laser'
                ? '#A855F7'
                : projSkin === 'tomato'
                  ? '#EF4444'
                  : b.color;
          ctx.lineCap = 'round';
          for (let t = 1; t < b.trail.length; t++) {
            const alpha = (t / b.trail.length) * (b.isDeflected ? 0.65 : 0.4);
            ctx.globalAlpha = alpha;
            ctx.lineWidth = (t / b.trail.length) * b.radius * 1.3;
            ctx.beginPath();
            ctx.moveTo(b.trail[t - 1].x, b.trail[t - 1].y);
            ctx.lineTo(b.trail[t].x, b.trail[t].y);
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.save();
        ctx.translate(b.x, b.y);
        const moveAngle = Math.atan2(b.vy, b.vx);

        if (projSkin === 'shuriken') {
          // Spinning 4-point Ninja Shuriken
          ctx.rotate(b.spinAngle);
          ctx.fillStyle = '#38BDF8';
          ctx.strokeStyle = '#F8FAFC';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let p = 0; p < 4; p++) {
            const a = (p * Math.PI) / 2;
            ctx.lineTo(Math.cos(a) * (b.radius + 5), Math.sin(a) * (b.radius + 5));
            ctx.lineTo(
              Math.cos(a + Math.PI / 4) * 3.5,
              Math.sin(a + Math.PI / 4) * 3.5
            );
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (projSkin === 'arrow') {
          // Flaming Arrow (Teer)
          ctx.rotate(moveAngle);
          ctx.strokeStyle = '#FDE047';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-10, 0);
          ctx.lineTo(8, 0);
          ctx.stroke();

          ctx.fillStyle = '#EA580C';
          ctx.beginPath();
          ctx.moveTo(12, 0);
          ctx.lineTo(3, -5);
          ctx.lineTo(3, 5);
          ctx.closePath();
          ctx.fill();
        } else if (projSkin === 'laser') {
          // Sci-Fi Neon Laser Bolt
          ctx.rotate(moveAngle);
          ctx.strokeStyle = '#A855F7';
          ctx.lineWidth = 8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-10, 0);
          ctx.lineTo(10, 0);
          ctx.stroke();

          ctx.strokeStyle = '#F3E8FF';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-8, 0);
          ctx.lineTo(8, 0);
          ctx.stroke();
        } else if (projSkin === 'tomato') {
          // Rotten Tomato with green stem leaf
          ctx.fillStyle = '#EF4444';
          ctx.strokeStyle = '#991B1B';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, b.radius + 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#22C55E';
          ctx.beginPath();
          ctx.arc(0, -b.radius, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Sniper Bullet
          ctx.rotate(moveAngle);
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = b.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-b.radius, -b.radius * 0.7, b.radius * 2.2, b.radius * 1.4, 4);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      // 11. Render Pooled Particles
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (!p.active) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 12. Render Floating Combat Texts
      ctx.save();
      ctx.font = '700 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      for (let i = 0; i < MAX_FLOATING_TEXTS; i++) {
        const ft = floatingTexts[i];
        if (!ft.active) continue;
        ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
        ctx.fillStyle = '#070A10';
        ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.restore();

      // 13. Low-HP Peripheral Vignette
      if (phaseRef.current === 'playing' && hp <= 2 && hp > 0) {
        const vigGrad = ctx.createRadialGradient(
          cx,
          cy,
          Math.min(width, height) * 0.3,
          cx,
          cy,
          Math.max(width, height) * 0.65
        );
        vigGrad.addColorStop(0, 'rgba(244, 63, 94, 0)');
        vigGrad.addColorStop(
          1,
          hp === 1 ? 'rgba(225, 29, 72, 0.32)' : 'rgba(225, 29, 72, 0.16)'
        );
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.restore();

      frameTimer = window.setTimeout(() => {
        rafId = requestAnimationFrame(tick);
      }, 16);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(frameTimer);
      resizeObserver.disconnect();
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#0B0F17]">
      <canvas
        ref={canvasRef}
        data-testid="arena-canvas"
        tabIndex={0}
        aria-label="Orbit Deflect 360-degree Bouncy Shield Arena"
        className="w-full h-full block outline-none cursor-crosshair"
      />
    </div>
  );
};
