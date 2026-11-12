import React, { useEffect, useRef } from 'react';
import {
  BulletState,
  calculateKillCoins,
  calculateKillScore,
  checkShieldDeflection,
  EnemyArchetype,
  EnemyState,
  getEnemyBulletSpec,
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
  getShieldSafetyRadians,
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
  bestScore: number;
  runNonce: number;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onAddCoins: (amount: number) => void;
  onUpdateBestScore: (newBest: number) => void;
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
  bestScore: propBestScore,
  runNonce,
  onHudUpdate,
  onAddCoins,
  onUpdateBestScore,
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

  const bestScoreRef = useRef<number>(propBestScore);
  bestScoreRef.current = propBestScore;

  const callbacksRef = useRef({
    onHudUpdate,
    onAddCoins,
    onUpdateBestScore,
    onLevelComplete,
    onGameOver,
    onTogglePause,
    onSelectStance,
  });
  callbacksRef.current = {
    onHudUpdate,
    onAddCoins,
    onUpdateBestScore,
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
    let enemies: EnemyState[] = [];
    let bullets: BulletState[] = [];

    const getSceneScale = () => Math.max(0.68, Math.min(1.12, Math.min(width, height) / 450));
    const getOrbitRadius = () => Math.round(66 * getSceneScale());
    const getPlayerRadius = () => Math.round(22 * getSceneScale());

    const updateCanvasSize = () => {
      const prevCx = width * 0.5;
      const prevCy = height * 0.5;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      // Re-fit active entities inside the new screen dimensions if resized while running
      const newCx = width * 0.5;
      const newCy = height * 0.5;
      const minDim = Math.min(width, height);
      const maxStandoff = minDim * 0.4;
      const minStandoff = getOrbitRadius() + 56 * getSceneScale();
      for (const e of enemies) {
        const ang = Math.atan2(e.y - prevCy, e.x - prevCx);
        e.standoffDist = Math.max(minStandoff, Math.min(maxStandoff, e.standoffDist));
        if (e.phase !== 'entering' && e.phase !== 'ko') {
          e.x = newCx + Math.cos(ang) * e.standoffDist;
          e.y = newCy + Math.sin(ang) * e.standoffDist;
        }
      }
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

    let shieldAngle = 0;
    let targetShieldAngle = 0;
    let shieldAngularVel = 0;
    let useTargetAngleTracking = false;

    const shieldAngleHistory: number[] = [];

    let isDragging = false;
    let lastDragX = 0;
    let lastDragY = 0;
    const keysPressed = new Set<string>();

    let hp = 5;
    const maxHp = 5;
    let crackedSocketIndex = -1;
    let crackedTimer = 0;
    let score = 0;
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

    // Infinity Mode Gift Power-up Timers & Spaced Cooldowns
    let dualShieldTimer = 0;
    let tripleWeaponTimer = 0;
    let fullAegisTimer = 0;
    let giftSpawnCooldownTimer = 18.0; // Never spawn gifts immediately or back-to-back
    let killsSinceLastGift = 0;
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
    let spawnCooldown = 0.5;
    let globalShotStaggerTimer = 0;
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
      const roundedAegis = Math.ceil(Math.max(0, fullAegisTimer) * 10) / 10;

      const key = `${modeRef.current}|${hp}|${crackedIdx}|${score}|${bestScoreRef.current}|${coinsRef.current}|${combo}|${displayLevel}|${remaining}|${defeatedInLevel}|${levelCfg.totalEnemiesInLevel}|${deflections}|${roundedPulse}|${roundedDual}|${roundedTriple}|${roundedAegis}|${stanceRef.current}|${soundEngine.muted}`;
      if (key === lastHudKey) return;
      lastHudKey = key;

      callbacksRef.current.onHudUpdate({
        gameMode: modeRef.current,
        hp,
        maxHp,
        crackedSocketIndex: crackedIdx,
        score,
        bestScore: bestScoreRef.current,
        coins: coinsRef.current,
        combo,
        level: displayLevel,
        enemiesRemaining: remaining,
        enemiesDefeated: isInfinity ? totalDefeatedInRun : defeatedInLevel,
        totalEnemiesInLevel: isInfinity ? 0 : levelCfg.totalEnemiesInLevel,
        deflections,
        pulseCooldown: roundedPulse,
        dualShieldTimer: roundedDual,
        tripleWeaponTimer: roundedTriple,
        fullAegisTimer: roundedAegis,
        stance: stanceRef.current,
        muted: soundEngine.muted,
      });
    };

    const spawnEnemyAtAngle = (
      angle: number,
      archetype: EnemyArchetype,
      aimDuration: number,
      readyImmediately = false,
      levelTier = 1
    ) => {
      const cx = width * 0.5;
      const cy = height * 0.5;
      const orbitR = getOrbitRadius();
      const scale = getSceneScale();
      const minDim = Math.min(width, height);
      const arenaRadius = minDim * 0.41;
      const standoffFactor =
        archetype === 'bastion'
          ? 0.64
          : archetype === 'flanker'
            ? 0.75
            : archetype === 'burst'
              ? 0.8
              : 0.72;
      const standoffDist = Math.max(
        orbitR + 56 * scale,
        Math.min(minDim * 0.39, arenaRadius * standoffFactor)
      );
      const spawnDist = readyImmediately ? standoffDist : Math.max(width, height) * 0.52;

      const isBastion = archetype === 'bastion';
      const baseRadius = isBastion ? 22 : archetype === 'burst' ? 18 : 17;
      enemies.push({
        id: nextEntityId++,
        archetype,
        levelTier,
        x: cx + Math.cos(angle) * spawnDist,
        y: cy + Math.sin(angle) * spawnDist,
        vx: 0,
        vy: 0,
        radius: Math.round(baseRadius * scale),
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
        { type: 'triple_weapon', label: 'TRIPLE SHOT', color: '#38BDF8' },
        { type: 'full_aegis', label: '360° SHIELD', color: '#F59E0B' },
        { type: 'extra_life', label: '+1 LIFE', color: '#F43F5E' },
      ];
      const chosen = types[Math.floor(Math.random() * types.length)];
      const angleToCenter = Math.atan2(cy - y, cx - x);
      const speed = 125;
      giftDrops.push({
        id: nextEntityId++,
        type: chosen.type,
        x,
        y,
        vx: Math.cos(angleToCenter) * speed,
        vy: Math.sin(angleToCenter) * speed,
        radius: 16,
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
      fullAegisTimer = 0;
      giftSpawnCooldownTimer = 22.0;
      killsSinceLastGift = 0;
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
      spawnEnemyAtAngle(0, 'marksman', cfg.aimTelegraphDuration, true, currentLevel);
      spawnEnemyAtAngle(
        -0.8,
        cfg.allowedArchetypes[1] ?? 'marksman',
        cfg.aimTelegraphDuration,
        false,
        currentLevel
      );
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
      if (Math.hypot(pt.x - cx, pt.y - cy) > 16) {
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
      if (isDragging && pt.y > height * 0.72) {
        const dx = pt.x - lastDragX;
        targetShieldAngle = normalizeAngle(targetShieldAngle + dx * 0.015);
        useTargetAngleTracking = true;
      } else if (distFromCenter > 14) {
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
        const orbitR = getOrbitRadius();
        spawnParticles(
          cx + Math.cos(shieldAngle) * orbitR,
          cy + Math.sin(shieldAngle) * orbitR,
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
      const scale = getSceneScale();
      const ORBIT_RADIUS = getOrbitRadius();
      const PLAYER_RADIUS = getPlayerRadius();
      const stance = SHIELD_STANCES[stanceRef.current];
      const activeLoadout = loadoutRef.current;

      const equippedShieldArc =
        fullAegisTimer > 0 ? Math.PI * 2 : getShieldSafetyRadians(activeLoadout.shield);

      cameraTrauma = Math.max(0, cameraTrauma - dt * 2.4);
      playerHitFlashTimer = Math.max(0, playerHitFlashTimer - dt);
      crackedTimer = Math.max(0, crackedTimer - dt);
      shieldRecoil *= Math.pow(0.001, dt);

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

      // HOME SCREEN ('title'): Only rotate Hero & Shield cleanly on the 3D Island — NO gameplay/enemies!
      if (phaseRef.current === 'title') {
        const prevAngle = shieldAngle;
          if (useTargetAngleTracking) {
            shieldAngle = stepAngleTowards(shieldAngle, targetShieldAngle, dt * 11.5);
            shieldAngularVel = shortestAngleDiff(prevAngle, shieldAngle) / dt;
            if (Math.abs(shieldAngularVel) > 2.2) {
              soundEngine.playShieldRotate(shieldAngularVel, activeLoadout.shield);
            }
          } else {
            shieldAngle = normalizeAngle(shieldAngle + dt * 1.25);
            shieldAngularVel = shortestAngleDiff(prevAngle, shieldAngle) / dt;
          }

          shieldAngleHistory.push(shieldAngle);
          if (shieldAngleHistory.length > 14) shieldAngleHistory.shift();
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
                bestScore: bestScoreRef.current,
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
            if (Math.abs(shieldAngularVel) > 2.2) {
              soundEngine.playShieldRotate(shieldAngularVel, activeLoadout.shield);
            }

          shieldAngleHistory.push(shieldAngle);
          if (shieldAngleHistory.length > 15) shieldAngleHistory.shift();

          if (hitstopTimer > 0) {
            hitstopTimer = Math.max(0, hitstopTimer - dt);
          } else {
            const simDt = dt;
            const isInfinity = modeRef.current === 'infinity';
            if (isInfinity) {
              infinityElapsed += simDt;
              giftSpawnCooldownTimer = Math.max(0, giftSpawnCooldownTimer - simDt);
            }

            pulseActiveTimer = Math.max(0, pulseActiveTimer - simDt);
            pulseCooldownTimer = Math.max(0, pulseCooldownTimer - simDt);
            dualShieldTimer = Math.max(0, dualShieldTimer - simDt);
            tripleWeaponTimer = Math.max(0, tripleWeaponTimer - simDt);
            fullAegisTimer = Math.max(0, fullAegisTimer - simDt);
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
            const activeTier = isInfinity ? infDiff.tier : currentLevel;

            const maxConcurrentEnemies = isInfinity
              ? infDiff.maxConcurrentEnemies
              : levelCfg.maxConcurrentEnemies;
            const maxConcurrentAttackers = isInfinity
              ? infDiff.maxConcurrentAttackers
              : levelCfg.maxConcurrentAttackers;
            const baseBulletSpeed = isInfinity ? infDiff.bulletSpeed : levelCfg.bulletSpeed;
            const bulletSpeed = baseBulletSpeed * Math.max(0.84, Math.min(1.05, getSceneScale()));
            const aimTelegraphDuration = isInfinity
              ? infDiff.aimTelegraphDuration
              : levelCfg.aimTelegraphDuration;
            const staggerDelay = isInfinity
              ? infDiff.staggerDelayBetweenShots
              : levelCfg.staggerDelayBetweenShots;
            const allowedArchetypes = isInfinity
              ? infDiff.allowedArchetypes
              : levelCfg.allowedArchetypes;

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
              spawnEnemyAtAngle(
                candidateAngle,
                chosenArchetype,
                aimTelegraphDuration,
                false,
                activeTier
              );
              spawnedInLevel++;
              spawnCooldown = activeTier === 1 ? 1.35 : Math.max(0.52, 1.2 - activeTier * 0.05);
            }

            // Update Floating Gift Drops in Infinity Mode
            for (let gIdx = giftDrops.length - 1; gIdx >= 0; gIdx--) {
              const g = giftDrops[gIdx];
              g.x += g.vx * simDt;
              g.y += g.vy * simDt;

              const distToCenter = Math.hypot(g.x - cx, g.y - cy);
              if (distToCenter <= ORBIT_RADIUS + g.radius + 10) {
                soundEngine.playGiftPickup();
                // Enforce one active timed power at a time + 26s cooldown before next gift!
                giftSpawnCooldownTimer = 26.0;
                killsSinceLastGift = 0;

                if (g.type === 'dual_shield') {
                  dualShieldTimer = 12.0;
                  spawnFloatingText(g.x, g.y - 12, 'GIFT: DUAL SHIELD (12s)!', '#34D399');
                } else if (g.type === 'extra_life') {
                  hp = Math.min(maxHp, hp + 1);
                  spawnFloatingText(g.x, g.y - 12, 'GIFT: +1 LIFE!', '#FCA5A5');
                } else if (g.type === 'triple_weapon') {
                  tripleWeaponTimer = 10.0;
                  spawnFloatingText(g.x, g.y - 12, 'GIFT: TRIPLE SHOT (10s)!', '#38BDF8');
                } else if (g.type === 'full_aegis') {
                  fullAegisTimer = 10.0;
                  spawnFloatingText(g.x, g.y - 12, 'GIFT: 360° SHIELD (10s)!', '#FDE047');
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
                const moveSpeed = e.archetype === 'bastion' ? 140 : 210;
                if (dist > e.standoffDist + 8) {
                  e.vx = -Math.cos(e.angleToCenter) * moveSpeed;
                  e.vy = -Math.sin(e.angleToCenter) * moveSpeed;
                  e.x += e.vx * simDt;
                  e.y += e.vy * simDt;
                } else {
                  e.vx = 0;
                  e.vy = 0;
                  e.phase = 'positioning';
                  e.phaseTimer = 0.32 + Math.random() * 0.3;
                }
              } else if (e.phase === 'positioning') {
                if (e.archetype === 'flanker') {
                  const tangentAngle = e.angleToCenter + (Math.PI / 2) * e.orbitDir;
                  const orbitSpeed = 90;
                  e.vx = Math.cos(tangentAngle) * orbitSpeed;
                  e.vy = Math.sin(tangentAngle) * orbitSpeed;
                  e.x += e.vx * simDt;
                  e.y += e.vy * simDt;
                  const newAngle = Math.atan2(e.y - cy, e.x - cx);
                  e.x = cx + Math.cos(newAngle) * e.standoffDist;
                  e.y = cy + Math.sin(newAngle) * e.standoffDist;
                  e.angleToCenter = newAngle;
                } else if (e.archetype === 'bastion') {
                  if (dist > ORBIT_RADIUS + 95 * scale) {
                    e.vx = -Math.cos(e.angleToCenter) * 26;
                    e.vy = -Math.sin(e.angleToCenter) * 26;
                    e.x += e.vx * simDt;
                    e.y += e.vy * simDt;
                  } else {
                    e.vx = 0;
                    e.vy = 0;
                  }
                } else {
                  e.vx = 0;
                  e.vy = 0;
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
                e.vx = 0;
                e.vy = 0;
                e.phaseTimer -= simDt;
                if (e.phaseTimer <= 0) {
                  e.phase = 'firing';
                  e.phaseTimer = 0.05;
                }
              } else if (e.phase === 'firing') {
                const aimAngle = Math.atan2(cy - e.y, cx - e.x);
                const spreadOffset =
                  e.archetype === 'burst' ? (e.burstRemaining === 2 ? -0.055 : 0.055) : 0;
                const shotAngle = aimAngle + spreadOffset;
                const spec = getEnemyBulletSpec(e.archetype, e.levelTier ?? activeTier);
                const bSpeed = bulletSpeed * spec.speedMultiplier;

                bullets.push({
                  id: nextEntityId++,
                  x: e.x + Math.cos(shotAngle) * (e.radius + 8),
                  y: e.y + Math.sin(shotAngle) * (e.radius + 8),
                  vx: Math.cos(shotAngle) * bSpeed,
                  vy: Math.sin(shotAngle) * bSpeed,
                  radius: spec.radius * scale,
                  isDeflected: false,
                  deflectCount: 0,
                  pierceRemaining: 1,
                  wallBouncesRemaining: 0,
                  sourceEnemyId: e.id,
                  sourceArchetype: e.archetype,
                  bulletType: spec.bulletType,
                  powerLevel: spec.powerLevel,
                  damage: spec.damage,
                  isPowerDeflect: false,
                  color: spec.color,
                  coreColor: spec.coreColor,
                  spinAngle: 0,
                  trail: [],
                });

                soundEngine.playEnemyShoot(e.archetype, spec.powerLevel);
                e.burstRemaining--;
                if (e.burstRemaining > 0) {
                  e.phase = 'aiming';
                  e.phaseTimer = 0.28;
                  e.aimDuration = 0.28;
                } else {
                  e.phase = 'recovering';
                  e.phaseTimer = Math.max(0.6, 1.05 - activeTier * 0.025);
                }
              } else if (e.phase === 'recovering') {
                e.phaseTimer -= simDt;
                if (e.phaseTimer <= 0) {
                  e.phase = 'positioning';
                  e.phaseTimer = 0.32;
                }
              }
            }

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
                    dualShieldTimer > 0,
                    equippedShieldArc
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
                    if (score > bestScoreRef.current) {
                      bestScoreRef.current = score;
                      callbacksRef.current.onUpdateBestScore(score);
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

                  const distToPlayer = Math.hypot(b.x - cx, b.y - cy);
                  if (distToPlayer < PLAYER_RADIUS + b.radius - 2) {
                    const hitDmg = b.damage ?? 1;
                    bullets.splice(i, 1);
                    bulletRemoved = true;

                    hp = Math.max(0, hp - hitDmg);
                    crackedSocketIndex = hp;
                    crackedTimer = 1.6;
                    combo = 1;
                    hitstopTimer = 0.065;
                    cameraTrauma = Math.min(1, cameraTrauma + 0.65);
                    playerHitFlashTimer = 0.28;
                    soundEngine.playPlayerHurt();
                    spawnFloatingText(cx, cy - 28 * scale, 'AAHH!', '#F87171');
                    spawnParticles(cx, cy, 24, 0, Math.PI * 2, 80, 290, '#F43F5E', 4.5);
                    pushHudSnapshot();

                    if (hp <= 0 && pendingOutcome === null) {
                      pendingOutcome = 'defeat';
                      defeatDelayTimer = 0.48;
                    }
                    break;
                  }
                } else {
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
                        killsSinceLastGift++;
                        if (isBank) bankKills++;

                        const killPts = calculateKillScore(
                          enemy.archetype,
                          combo,
                          isBank,
                          b.isPowerDeflect
                        );
                        score += killPts;
                        if (score > bestScoreRef.current) {
                          bestScoreRef.current = score;
                          callbacksRef.current.onUpdateBestScore(score);
                        }

                        const coinGain = calculateKillCoins(
                          isInfinity,
                          totalDefeatedInRun,
                          isBank
                        );
                        if (coinGain > 0) {
                          runCoinsEarned += coinGain;
                          callbacksRef.current.onAddCoins(coinGain);
                        }

                        // Spaced Infinity Gift Drop: only when no gift power is active, cooldown elapsed, and >= 7 kills since last gift!
                        const anyGiftActive =
                          dualShieldTimer > 0 ||
                          tripleWeaponTimer > 0 ||
                          fullAegisTimer > 0 ||
                          giftDrops.length > 0;
                        if (
                          isInfinity &&
                          !anyGiftActive &&
                          giftSpawnCooldownTimer <= 0 &&
                          killsSinceLastGift >= 7
                        ) {
                          giftSpawnCooldownTimer = 26.0;
                          killsSinceLastGift = 0;
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
                          coinGain > 0 ? `+${killPts} · +${coinGain}c` : `+${killPts}`,
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
      if (hudSyncAccumulator >= 0.12) {
        hudSyncAccumulator = 0;
        if (phaseRef.current === 'playing') {
          pushHudSnapshot();
        }
      }

      // ========================================================================
      // RENDER 3D NATURE BATTLEGROUND: LUSH GRASS, WATERFALL, WINDING RIVER & BRIDGES
      // ========================================================================
      ctx.save();
      ctx.scale(dpr, dpr);

      const shakeMag = cameraTrauma * cameraTrauma * 14;
      const shakeX = (Math.random() * 2 - 1) * shakeMag;
      const shakeY = (Math.random() * 2 - 1) * shakeMag;
      ctx.translate(shakeX, shakeY);

      if (phaseRef.current === 'title') {
        // ======================================================================
        // HOME SCREEN ('title'): Clean, Normal Studio Backdrop (No River/Waterfall under Player)
        // ======================================================================
        const homeBgGrad = ctx.createLinearGradient(0, 0, 0, height);
        homeBgGrad.addColorStop(0, '#070B14');
        homeBgGrad.addColorStop(0.5, '#0F172A');
        homeBgGrad.addColorStop(1, '#1E293B');
        ctx.fillStyle = homeBgGrad;
        ctx.fillRect(-20, -20, width + 40, height + 40);

        // Subtle perspective floor grid on Home Screen
        ctx.save();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
        ctx.lineWidth = 1.5;
        for (let col = -10; col <= 10; col++) {
          ctx.beginPath();
          ctx.moveTo(cx + col * 36, 0);
          ctx.lineTo(cx + col * 135, height);
          ctx.stroke();
        }
        let rowY = 30;
        let rowStep = 30;
        while (rowY < height + 20) {
          ctx.beginPath();
          ctx.moveTo(0, rowY);
          ctx.lineTo(width, rowY);
          ctx.stroke();
          rowY += rowStep;
          rowStep *= 1.12;
        }
        ctx.restore();

        // Soft spotlight around the center Hero Pedestal
        const spotGrad = ctx.createRadialGradient(cx, cy, 12, cx, cy, Math.max(width, height) * 0.48);
        spotGrad.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
        spotGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.2)');
        spotGrad.addColorStop(1, 'rgba(3, 7, 18, 0.72)');
        ctx.fillStyle = spotGrad;
        ctx.fillRect(0, 0, width, height);
      } else {
        // ======================================================================
        // GAMEPLAY ('playing' / 'paused' / 'gameover'):
        // Lush Grass Valley with Side Cliff Waterfall & Perimeter Winding River
        // (Player stands on solid grassy ground in the center — NEVER on the river!)
        // ======================================================================
        const grassGrad = ctx.createLinearGradient(0, 0, 0, height);
        grassGrad.addColorStop(0, '#0F291E');
        grassGrad.addColorStop(0.22, '#14532D');
        grassGrad.addColorStop(0.6, '#166534');
        grassGrad.addColorStop(1, '#114224');
        ctx.fillStyle = grassGrad;
        ctx.fillRect(-20, -20, width + 40, height + 40);

        // Perspective mowed grass turf bands
        ctx.save();
        let bandY = height * 0.12;
        let bandH = 26;
        let bandIdx = 0;
        while (bandY < height + 20) {
          if (bandIdx % 2 === 0) {
            ctx.fillStyle = 'rgba(74, 222, 128, 0.045)';
            ctx.fillRect(0, bandY, width, bandH);
          }
          bandY += bandH;
          bandH *= 1.1;
          bandIdx++;
        }
        ctx.restore();

        // Top Horizon Rocky Cliff Wall
        const cliffH = Math.max(68, Math.min(100, height * 0.12));
        const wfCenterX = Math.max(64, width * 0.18);
        const wfWidth = Math.max(54, Math.min(92, width * 0.16));

        ctx.fillStyle = '#091510';
        ctx.fillRect(0, 0, width, cliffH + 8);

        const cliffGrad = ctx.createLinearGradient(0, 0, 0, cliffH);
        cliffGrad.addColorStop(0, '#1E293B');
        cliffGrad.addColorStop(0.65, '#334155');
        cliffGrad.addColorStop(1, '#1E293B');
        ctx.fillStyle = cliffGrad;
        ctx.fillRect(0, 0, width, cliffH);

        ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
        ctx.lineWidth = 2;
        for (let rx = 25; rx < width; rx += 55) {
          ctx.beginPath();
          ctx.moveTo(rx, 0);
          ctx.lineTo(rx - 10, cliffH);
          ctx.stroke();
        }

        ctx.fillStyle = '#15803D';
        ctx.fillRect(0, 0, width, 14);

        // Perimeter Winding River flowing along the Left Valley Edge (far away from center player!)
        ctx.save();
        const drawSideRiverPath = (extraWidth: number, offsetY = 0) => {
          ctx.beginPath();
          ctx.moveTo(wfCenterX, cliffH - 4 + offsetY);
          ctx.bezierCurveTo(
            Math.max(24, wfCenterX * 0.45),
            height * 0.38 + offsetY,
            Math.max(30, wfCenterX * 0.95),
            height * 0.72 + offsetY,
            Math.max(36, width * 0.22),
            height + 30 + offsetY
          );
          ctx.lineWidth = wfWidth * 0.62 + extraWidth;
          ctx.lineCap = 'round';
          ctx.stroke();
        };

        ctx.strokeStyle = '#1E293B';
        drawSideRiverPath(16, 5);
        ctx.strokeStyle = '#78350F';
        drawSideRiverPath(10, 2);

        const riverGrad = ctx.createLinearGradient(0, cliffH, 0, height);
        riverGrad.addColorStop(0, '#38BDF8');
        riverGrad.addColorStop(0.45, '#0284C7');
        riverGrad.addColorStop(1, '#0369A1');
        ctx.strokeStyle = riverGrad;
        drawSideRiverPath(0, 0);

        ctx.strokeStyle = 'rgba(186, 230, 253, 0.38)';
        ctx.lineWidth = wfWidth * 0.22;
        ctx.setLineDash([16, 24]);
        ctx.lineDashOffset = -animClock * 55;
        ctx.beginPath();
        ctx.moveTo(wfCenterX, cliffH);
        ctx.bezierCurveTo(
          Math.max(24, wfCenterX * 0.45),
          height * 0.38,
          Math.max(30, wfCenterX * 0.95),
          height * 0.72,
          Math.max(36, width * 0.22),
          height + 30
        );
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Cascading Waterfall Chute on Top-Left Cliff
        ctx.save();
        const wfLeft = wfCenterX - wfWidth * 0.42;
        const wfActualW = wfWidth * 0.84;

        const wfGrad = ctx.createLinearGradient(0, 0, 0, cliffH + 12);
        wfGrad.addColorStop(0, '#7DD3FC');
        wfGrad.addColorStop(0.5, '#0EA5E9');
        wfGrad.addColorStop(1, '#E0F2FE');
        ctx.fillStyle = wfGrad;
        ctx.beginPath();
        ctx.roundRect(wfLeft, 0, wfActualW, cliffH + 10, 6);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.setLineDash([12, 14]);
        for (let s = 0; s < 5; s++) {
          const sx = wfLeft + 8 + (s / 4) * (wfActualW - 16);
          ctx.lineDashOffset = -(animClock * (90 + (s % 3) * 18) + s * 9);
          ctx.beginPath();
          ctx.moveTo(sx, 2);
          ctx.lineTo(sx, cliffH + 8);
          ctx.stroke();
        }
        ctx.setLineDash([]);

        const foamPulse = Math.sin(animClock * 6) * 2.5;
        ctx.fillStyle = 'rgba(224, 242, 254, 0.78)';
        ctx.beginPath();
        ctx.ellipse(wfCenterX, cliffH + 9, wfActualW * 0.6 + foamPulse, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Decorative Grass Tufts & Corner Trees on the Grassy Meadow
        ctx.save();
        const drawGrassTuft = (gx: number, gy: number) => {
          ctx.strokeStyle = '#4ADE80';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx - 4, gy - 7);
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx, gy - 9);
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx + 4, gy - 7);
          ctx.stroke();
        };
        drawGrassTuft(cx - ORBIT_RADIUS * 1.15, cy - ORBIT_RADIUS * 0.75);
        drawGrassTuft(cx + ORBIT_RADIUS * 1.15, cy - ORBIT_RADIUS * 0.65);
        drawGrassTuft(cx - ORBIT_RADIUS * 1.05, cy + ORBIT_RADIUS * 0.85);
        drawGrassTuft(cx + ORBIT_RADIUS * 1.1, cy + ORBIT_RADIUS * 0.7);
        drawGrassTuft(width * 0.78, height * 0.32);
        drawGrassTuft(width * 0.82, height * 0.68);

        const drawTree = (tx: number, ty: number, tr: number) => {
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.beginPath();
          ctx.ellipse(tx + 5, ty + 10, tr * 1.05, tr * 0.75, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#064E3B';
          ctx.beginPath();
          ctx.arc(tx, ty + 3, tr, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#059669';
          ctx.beginPath();
          ctx.arc(tx - 2, ty - 2, tr * 0.82, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#34D399';
          ctx.beginPath();
          ctx.arc(tx - 4, ty - 5, tr * 0.48, 0, Math.PI * 2);
          ctx.fill();
        };
        const treeR = Math.round(22 * scale);
        drawTree(width - treeR - 14, cliffH + treeR + 18, treeR);
        drawTree(width - treeR - 16, height - treeR - 24, treeR * 0.9);
        ctx.restore();
      }

      // 7. 3D Raised Octagonal Stone Hero Pedestal in Center of Island
      const drawOctagon = (ox: number, oy: number, rx: number, ry: number) => {
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4 + Math.PI / 8;
          const px = ox + Math.cos(a) * rx;
          const py = oy + Math.sin(a) * ry;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      };

      ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
      drawOctagon(cx, cy + 12 * scale, 48 * scale, 38 * scale);
      ctx.fill();

      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      drawOctagon(cx, cy + 7 * scale, 43 * scale, 34 * scale);
      ctx.fill();
      ctx.stroke();

      const pedTopGrad = ctx.createLinearGradient(cx, cy - 32 * scale, cx, cy + 32 * scale);
      pedTopGrad.addColorStop(0, '#475569');
      pedTopGrad.addColorStop(1, '#1E293B');
      ctx.fillStyle = pedTopGrad;
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      drawOctagon(cx, cy, 41 * scale, 32 * scale);
      ctx.fill();
      ctx.stroke();

      // 8. Enemy Aim Telegraphs & Ricochet Sight Line (ONLY in 'playing' / 'paused' / 'gameover')
      if (phaseRef.current !== 'title') {
        for (const e of enemies) {
          if (e.phase === 'aiming') {
            const progress = 1 - Math.max(0, e.phaseTimer / Math.max(0.01, e.aimDuration));
            const aimAngle = Math.atan2(cy - e.y, cx - e.x);

            ctx.save();
            ctx.strokeStyle =
              progress > 0.75 ? 'rgba(244, 63, 94, 0.88)' : 'rgba(250, 204, 21, 0.55)';
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
              dualShieldTimer > 0,
              equippedShieldArc
            );
            if (predictedBounce) {
              const bounceAngle = Math.atan2(
                predictedBounce.reflectedVy,
                predictedBounce.reflectedVx
              );
              ctx.strokeStyle = 'rgba(52, 211, 153, 0.8)';
              ctx.lineWidth = 2.2;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(interceptX, interceptY);
              ctx.lineTo(
                interceptX + Math.cos(bounceAngle) * 240,
                interceptY + Math.sin(bounceAngle) * 240
              );
              ctx.stroke();
              ctx.setLineDash([]);
            }
            ctx.restore();
          }
        }
      }

      // 9. Render Full 3D Hero Character in Center (Action Hero with Legs, Cape/Armor, Arms & Sculpted Head)
      ctx.save();
      const charSkin = activeLoadout.character;
      const breathBob = Math.sin(animClock * 4.2) * 2 * scale;
      const floatOffset = charSkin === 'wizard' ? Math.sin(animClock * 4.5) * 5 * scale - 4 : breathBob;

      // 3D Hero Cast Shadow on Pedestal
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 13 * scale, PLAYER_RADIUS * 0.95, PLAYER_RADIUS * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(cx, cy - 4 * scale + floatOffset);
      ctx.scale(scale, scale);

      // Hero 3D Boots / Legs Stance
      ctx.fillStyle = '#090D16';
      ctx.beginPath();
      ctx.roundRect(-11, 8, 8, 10, 3);
      ctx.roundRect(3, 8, 8, 10, 3);
      ctx.fill();

      if (charSkin === 'agent') {
        // Billowing Heroic Black Trench Coat Cape
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-18, -4);
        ctx.lineTo(-22, 14);
        ctx.lineTo(22, 14);
        ctx.lineTo(18, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Muscular Hero Torso & Suit Jacket
        ctx.fillStyle = playerHitFlashTimer > 0 ? '#FFFFFF' : '#1E293B';
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-14, -6, 28, 18, 6);
        ctx.fill();
        ctx.stroke();

        // Shirt & Red Hero Tie
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.moveTo(-5, -5);
        ctx.lineTo(0, 9);
        ctx.lineTo(5, -5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(-1.8, -4, 3.6, 12);

        // Heroic 3D Arms & Gloves
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(-16, 2, 5.5, 0, Math.PI * 2);
        ctx.arc(16, 2, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Sculpted Hero Head, Spiky Hair & Glowing 3D Sunglasses
        ctx.fillStyle = '#FDE68A';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, -14, 11.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(0, -17, 11.5, Math.PI, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#020617';
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.4;
        ctx.fillRect(-10, -17, 9, 5.5);
        ctx.strokeRect(-10, -17, 9, 5.5);
        ctx.fillRect(1, -17, 9, 5.5);
        ctx.strokeRect(1, -17, 9, 5.5);
      } else if (charSkin === 'monk') {
        // Golden Dragon Aura & Dual Katana Hilt on Back
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-18, -22);
        ctx.lineTo(18, 12);
        ctx.stroke();

        // Heroic Orange/Gold Martial Arts Gi Torso
        ctx.fillStyle = '#D97706';
        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-14, -6, 28, 18, 6);
        ctx.fill();
        ctx.stroke();

        // Black Belt & Arms
        ctx.fillStyle = '#090D16';
        ctx.fillRect(-14, 4, 28, 4);
        ctx.fillStyle = '#FDE68A';
        ctx.beginPath();
        ctx.arc(-16, 2, 5, 0, Math.PI * 2);
        ctx.arc(16, 2, 5, 0, Math.PI * 2);
        ctx.fill();

        // Sculpted Ninja/Monk Head & Flowing Red Headband
        ctx.fillStyle = '#FDE68A';
        ctx.strokeStyle = '#92400E';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, -14, 11.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-12, -17);
        ctx.lineTo(12, -17);
        ctx.lineTo(20, -13 + Math.sin(animClock * 8) * 3);
        ctx.stroke();

        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(-4.5, -13, 2, 0, Math.PI * 2);
        ctx.arc(4.5, -13, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (charSkin === 'wizard') {
        // Billowing Arcane Cape & Glowing Staff
        ctx.fillStyle = '#4C1D95';
        ctx.strokeStyle = '#C084FC';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-16, -6);
        ctx.lineTo(-22, 14);
        ctx.lineTo(22, 14);
        ctx.lineTo(16, -6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing Arcane Staff in Right Hand
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(18, -22);
        ctx.lineTo(18, 14);
        ctx.stroke();
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(18, -24, 5, 0, Math.PI * 2);
        ctx.fill();

        // Head & Pointed 3D Wizard Hat
        ctx.fillStyle = '#3B0764';
        ctx.beginPath();
        ctx.arc(0, -13, 10.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FDE047';
        ctx.beginPath();
        ctx.arc(-4, -13, 2.3, 0, Math.PI * 2);
        ctx.arc(4, -13, 2.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#6B21A8';
        ctx.strokeStyle = '#E9D5FF';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-16, -18);
        ctx.lineTo(0, -38);
        ctx.lineTo(16, -18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (charSkin === 'astronaut') {
        // 3D Jetpack & Armored Space Marine Pauldrons
        ctx.fillStyle = '#64748B';
        ctx.fillRect(-17, -8, 34, 18);
        ctx.fillStyle = '#F8FAFC';
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-14, -6, 28, 18, 6);
        ctx.fill();
        ctx.stroke();

        // Glowing Chest Reactor Core
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(0, 2, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // 3D Helmet & Gold Reflective Visor
        ctx.fillStyle = '#F8FAFC';
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -15, 12.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#F59E0B';
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-9.5, -20, 19, 11, 5);
        ctx.fill();
        ctx.stroke();
      } else {
        // Cyber DJ Hero with Neon Jacket & Floating Turntable
        ctx.fillStyle = '#1E1B4B';
        ctx.strokeStyle = '#EC4899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-15, -6, 30, 18, 6);
        ctx.fill();
        ctx.stroke();

        // Head, Headphones & LED Visor
        ctx.fillStyle = '#FDE68A';
        ctx.beginPath();
        ctx.arc(0, -14, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, -15, 13, Math.PI, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#EC4899';
        ctx.fillRect(-15, -18, 4, 9);
        ctx.fillRect(11, -18, 4, 9);
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(-8, -17, 16, 5);
      }
      ctx.restore();

      // 10. Render Shield Ribbon Trail
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
          ctx.lineWidth = ratio * 9 * scale;

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

      // 11. Render Orbiting Shield Skin (with distinct color for 120°/180°/220°/270°/360° extended arcs & Dual Shield!)
      const shieldAnglesToRender =
        dualShieldTimer > 0 && equippedShieldArc < Math.PI * 1.95
          ? [shieldAngle, normalizeAngle(shieldAngle + Math.PI)]
          : [shieldAngle];

      const halfArc =
        Math.min(Math.PI * 2, equippedShieldArc * (pulseActiveTimer > 0 ? 1.2 : 1.0)) * 0.5;
      const primaryCoreHalfArc = Math.min(halfArc, Math.PI * 0.25); // 90° total (±45°) primary directional core
      const hasExtendedWings = halfArc > primaryCoreHalfArc + 0.04;
      const shieldSkin = activeLoadout.shield;

      // Contrasting color palette for bonus/extended shield coverage so user always sees primary shield direction
      const bonusOuterGlow =
        shieldSkin === 'rune' ? 'rgba(236, 72, 153, 0.42)' : 'rgba(6, 182, 212, 0.42)';
      const bonusBodyColor = shieldSkin === 'rune' ? '#EC4899' : '#06B6D4';
      const bonusHighlightColor = shieldSkin === 'rune' ? '#FBCFE8' : '#CFFAFE';

      for (let sIdx = 0; sIdx < shieldAnglesToRender.length; sIdx++) {
        const sAngle = shieldAnglesToRender[sIdx];
        const isSecondaryDualShield = sIdx > 0;
        const startArc = sAngle - halfArc;
        const endArc = sAngle + halfArc;

        ctx.save();

        // Ground Drop Shadow under the floating Shield
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.lineWidth = 15 * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy + 11 * scale, effectiveRadius, startArc, endArc);
        ctx.stroke();

        // Extruded Bottom Rim of the Shield
        ctx.strokeStyle = '#090D16';
        ctx.lineWidth = 16 * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy + 3.5 * scale, effectiveRadius, startArc, endArc);
        ctx.stroke();

        // A. If this is the secondary Dual Shield OR the shield has >90° extended safety angle (120°/180°/220°/270°/360°),
        // render the extended/bonus arc in a distinct contrasting energy color first!
        if (isSecondaryDualShield || hasExtendedWings) {
          ctx.strokeStyle = bonusOuterGlow;
          ctx.lineWidth = 19 * scale;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(cx, cy, effectiveRadius, startArc, endArc);
          ctx.stroke();

          ctx.strokeStyle = bonusBodyColor;
          ctx.lineWidth = 11.5 * scale;
          ctx.beginPath();
          ctx.arc(cx, cy, effectiveRadius, startArc, endArc);
          ctx.stroke();

          ctx.strokeStyle = bonusHighlightColor;
          ctx.lineWidth = 3.2 * scale;
          ctx.setLineDash([8 * scale, 5 * scale]);
          ctx.beginPath();
          ctx.arc(cx, cy - 1, effectiveRadius, startArc, endArc);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // B. Render the Primary Front Shield Core (centered at shieldAngle) in the main shield skin color
        // so the user always knows the exact direction their primary shield is facing!
        if (!isSecondaryDualShield) {
          const coreStart = sAngle - primaryCoreHalfArc;
          const coreEnd = sAngle + primaryCoreHalfArc;

          if (shieldSkin === 'pan') {
            ctx.strokeStyle = '#1E293B';
            ctx.lineWidth = 14 * scale;
            ctx.beginPath();
            ctx.arc(cx, cy, effectiveRadius, coreStart, coreEnd);
            ctx.stroke();

            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 4.2 * scale;
            ctx.beginPath();
            ctx.arc(cx, cy - 1, effectiveRadius, coreStart, coreEnd);
            ctx.stroke();
          } else if (shieldSkin === 'lightsaber') {
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
            ctx.lineWidth = 21 * scale;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(cx, cy, effectiveRadius, coreStart, coreEnd);
            ctx.stroke();

            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 11 * scale;
            ctx.beginPath();
            ctx.arc(cx, cy, effectiveRadius, coreStart, coreEnd);
            ctx.stroke();

            ctx.strokeStyle = '#ECFDF5';
            ctx.lineWidth = 4 * scale;
            ctx.beginPath();
            ctx.arc(cx, cy, effectiveRadius, coreStart, coreEnd);
            ctx.stroke();
          } else if (shieldSkin === 'rune') {
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
            ctx.lineWidth = 16 * scale;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(cx, cy, effectiveRadius, coreStart, coreEnd);
            ctx.stroke();

            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 10 * scale;
            ctx.beginPath();
            ctx.arc(cx, cy, effectiveRadius, coreStart, coreEnd);
            ctx.stroke();

            ctx.strokeStyle = '#E0F2FE';
            ctx.lineWidth = 3.8 * scale;
            ctx.beginPath();
            ctx.arc(cx, cy, effectiveRadius, coreStart, coreEnd);
            ctx.stroke();
          } else if (shieldSkin === 'vinyl') {
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 15 * scale;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(cx, cy, effectiveRadius, coreStart, coreEnd);
            ctx.stroke();

            ctx.strokeStyle = '#F43F5E';
            ctx.lineWidth = 6 * scale;
            ctx.beginPath();
            ctx.arc(cx, cy, effectiveRadius, coreStart, coreEnd);
            ctx.stroke();
          } else if (shieldSkin === 'donut') {
            ctx.strokeStyle = '#FBBF24';
            ctx.lineWidth = 16 * scale;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(cx, cy, effectiveRadius, coreStart, coreEnd);
            ctx.stroke();

            ctx.strokeStyle = '#F472B6';
            ctx.lineWidth = 10 * scale;
            ctx.beginPath();
            ctx.arc(cx, cy, effectiveRadius, coreStart, coreEnd);
            ctx.stroke();

            const sprinkleCount = Math.max(5, Math.floor((primaryCoreHalfArc * 2) * 3));
            for (let sp = 0; sp < sprinkleCount; sp++) {
              const spAngle = coreStart + (sp / sprinkleCount) * (primaryCoreHalfArc * 2);
              const sx = cx + Math.cos(spAngle) * effectiveRadius;
              const sy = cy + Math.sin(spAngle) * effectiveRadius;
              ctx.fillStyle = SPRINKLE_COLORS[sp % SPRINKLE_COLORS.length];
              ctx.beginPath();
              ctx.arc(sx, sy, 2.4 * scale, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            // Iron / Steel Primary Shield Core with bright gold/white specular ridge
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 13 * scale;
            ctx.beginPath();
            ctx.arc(cx, cy, effectiveRadius, coreStart, coreEnd);
            ctx.stroke();

            ctx.strokeStyle = '#FEF08A';
            ctx.lineWidth = 4.5 * scale;
            ctx.beginPath();
            ctx.arc(cx, cy - 1.5, effectiveRadius, coreStart, coreEnd);
            ctx.stroke();
          }

          // C. Front Directional Aim Chevron on the Primary Shield Center (sAngle)
          const tipDist = effectiveRadius + 11 * scale;
          const baseDist = effectiveRadius + 3 * scale;
          const wingAngleSpread = 0.13;
          const tipX = cx + Math.cos(sAngle) * tipDist;
          const tipY = cy + Math.sin(sAngle) * tipDist;
          const leftWingX = cx + Math.cos(sAngle - wingAngleSpread) * baseDist;
          const leftWingY = cy + Math.sin(sAngle - wingAngleSpread) * baseDist;
          const rightWingX = cx + Math.cos(sAngle + wingAngleSpread) * baseDist;
          const rightWingY = cy + Math.sin(sAngle + wingAngleSpread) * baseDist;

          ctx.fillStyle = '#FACC15';
          ctx.strokeStyle = '#090D16';
          ctx.lineWidth = 2 * scale;
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(leftWingX, leftWingY);
          ctx.lineTo(rightWingX, rightWingY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      // 12. Render Real-Life Humanoid Enemies & Distinct Projectiles ONLY when not on Home Screen ('title')
      if (phaseRef.current !== 'title') {
        // Render Infinity Mode 3D Gift Crates
        for (const g of giftDrops) {
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.beginPath();
          ctx.ellipse(g.x, g.y + 12, 13, 7, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.translate(g.x, g.y);
          ctx.fillStyle = '#090D16';
          ctx.fillRect(-13, -6, 26, 20);

          ctx.fillStyle = '#1E293B';
          ctx.strokeStyle = g.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-13, -13, 26, 22, 5);
          ctx.fill();
          ctx.stroke();

          ctx.strokeStyle = '#F8FAFC';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-13, -2);
          ctx.lineTo(13, -2);
          ctx.moveTo(0, -13);
          ctx.lineTo(0, 9);
          ctx.stroke();
          ctx.restore();
        }

        // Render Real-Life Styled 3D Humanoid Enemies:
        // 'marksman' -> Human Sniper Mercenary
        // 'flanker'  -> Mutant Zombie Runner
        // 'burst'    -> Alien Invader (Extraterrestrial Grey/Xenomorph)
        // 'bastion'  -> Armored Cyber-Juggernaut Boss
        for (const e of enemies) {
          ctx.save();
          if (e.phase === 'ko') {
            ctx.globalAlpha = Math.max(0, e.koTimer / 0.32);
          }

          const isMoving = Math.hypot(e.vx, e.vy) > 5;
          const stride = isMoving ? Math.sin(animClock * 14 + e.id) * 4 * scale : 0;
          const faceRight = cx >= e.x ? 1 : -1;
          const aimAngle = Math.atan2(cy - e.y, cx - e.x);
          const isFlash = e.hitFlashTimer > 0;

          // 3D Ground Shadow under Humanoid Enemy
          ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
          ctx.beginPath();
          ctx.ellipse(e.x, e.y + 14 * scale, e.radius * 0.95, e.radius * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();

          // Aiming Ring Telegraph at Enemy Feet
          if (e.phase === 'aiming') {
            const p = 1 - Math.max(0, e.phaseTimer / Math.max(0.01, e.aimDuration));
            ctx.strokeStyle = p > 0.7 ? '#F43F5E' : '#FACC15';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.ellipse(
              e.x,
              e.y + 12 * scale,
              e.radius + (1 - p) * 10,
              (e.radius + (1 - p) * 10) * 0.55,
              0,
              0,
              Math.PI * 2
            );
            ctx.stroke();
          }

          ctx.translate(e.x, e.y);
          ctx.scale(scale, scale);

          if (e.archetype === 'marksman') {
            // HUMAN SNIPER MERCENARY (Legs, Tactical Vest, Helmet, Goggles & Sniper Rifle)
            ctx.fillStyle = '#1E293B';
            ctx.fillRect(-7, 4 + stride, 5, 10);
            ctx.fillRect(2, 4 - stride, 5, 10);

            // Tactical Armored Torso
            ctx.fillStyle = isFlash ? '#FFFFFF' : '#334155';
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.roundRect(-10, -8, 20, 15, 4);
            ctx.fill();
            ctx.stroke();

            // Human Head & Tactical Helmet + Red Sniper Visor
            ctx.fillStyle = '#FDBA74';
            ctx.beginPath();
            ctx.arc(0, -15, 8.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#0F172A';
            ctx.beginPath();
            ctx.arc(0, -17, 9, Math.PI, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#EF4444';
            ctx.fillRect(faceRight > 0 ? -1 : -7, -16, 8, 3.5);

            // Articulated Sniper Rifle Aimed at Center
            ctx.save();
            ctx.rotate(aimAngle);
            ctx.fillStyle = '#090D16';
            ctx.fillRect(4, -2.5, 22, 5);
            ctx.fillStyle = '#F59E0B';
            ctx.fillRect(22, -1.5, 6, 3);
            ctx.restore();
          } else if (e.archetype === 'flanker') {
            // MUTANT ZOMBIE WALKER (Green Decayed Skin, Tattered Clothes, Glowing Red Eyes, Outstretched Claws)
            ctx.fillStyle = '#3F2E21';
            ctx.fillRect(-7, 4 + stride, 5, 10);
            ctx.fillRect(2, 4 - stride, 5, 10);

            // Tattered Zombie Shirt
            ctx.fillStyle = isFlash ? '#FFFFFF' : '#4D7C0F';
            ctx.strokeStyle = '#84CC16';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.roundRect(-10, -7, 20, 14, 4);
            ctx.fill();
            ctx.stroke();

            // Zombie Head with Green Skin, Scars & Glowing Eyes
            ctx.fillStyle = '#65A30D';
            ctx.strokeStyle = '#365314';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(0, -15, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#FEF08A';
            ctx.beginPath();
            ctx.arc(-3.5, -16, 2.2, 0, Math.PI * 2);
            ctx.arc(3.5, -16, 2.2, 0, Math.PI * 2);
            ctx.fill();

            // Outstretched Zombie Arms & Toxic Acid Orb
            ctx.save();
            ctx.rotate(aimAngle);
            ctx.strokeStyle = '#65A30D';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(4, -5);
            ctx.lineTo(17, -3);
            ctx.moveTo(4, 5);
            ctx.lineTo(17, 3);
            ctx.stroke();
            ctx.fillStyle = '#A3E635';
            ctx.beginPath();
            ctx.arc(19, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else if (e.archetype === 'burst') {
            // EXTRATERRESTRIAL ALIEN INVADER (Hovering Bio-Suit, Large Bulbous Alien Cranium, Slanted Black/Neon Eyes & Dual Plasma Blasters)
            ctx.fillStyle = isFlash ? '#FFFFFF' : '#581C87';
            ctx.strokeStyle = '#C084FC';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.roundRect(-10, -6, 20, 15, 6);
            ctx.fill();
            ctx.stroke();

            // Classic Large Bulbous Alien Head
            ctx.fillStyle = '#4ADE80';
            ctx.strokeStyle = '#16A34A';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(0, -17, 11.5, 9.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Large Slanted Alien Eyes
            ctx.fillStyle = '#020617';
            ctx.beginPath();
            ctx.ellipse(-4.5, -16, 3.8, 2.2, 0.35, 0, Math.PI * 2);
            ctx.ellipse(4.5, -16, 3.8, 2.2, -0.35, 0, Math.PI * 2);
            ctx.fill();

            // Dual Alien Plasma Blasters
            ctx.save();
            ctx.rotate(aimAngle);
            ctx.fillStyle = '#A855F7';
            ctx.fillRect(6, -7, 14, 4);
            ctx.fillRect(6, 3, 14, 4);
            ctx.fillStyle = '#38BDF8';
            ctx.beginPath();
            ctx.arc(21, -5, 2.5, 0, Math.PI * 2);
            ctx.arc(21, 5, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else {
            // ARMORED CYBER-JUGGERNAUT BOSS ('bastion': Hulking Mech Armor, Horned Helmet, Magma Core & Heavy Cannon)
            ctx.fillStyle = '#090D16';
            ctx.fillRect(-10, 6 + stride, 7, 11);
            ctx.fillRect(3, 6 - stride, 7, 11);

            ctx.fillStyle = isFlash ? '#FFFFFF' : '#7F1D1D';
            ctx.strokeStyle = '#F87171';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.roundRect(-15, -10, 30, 20, 6);
            ctx.fill();
            ctx.stroke();

            // Glowing Magma Core on Chest
            ctx.fillStyle = '#FDE047';
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();

            // Horned Juggernaut Helmet
            ctx.fillStyle = '#1E293B';
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(0, -17, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Heavy Plasma Cannon Arm
            ctx.save();
            ctx.rotate(aimAngle);
            ctx.fillStyle = '#1E293B';
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 1.8;
            ctx.fillRect(8, -5, 20, 10);
            ctx.strokeRect(8, -5, 20, 10);
            ctx.restore();
          }

          ctx.restore();
        }

        // Render Distinct 3D Enemy Projectiles (or Player's Equipped Deflected Projectile Skin)
        const projSkin = activeLoadout.projectile;
        for (const b of bullets) {
          // Ground shadow below flying projectile
          ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
          ctx.beginPath();
          ctx.ellipse(b.x, b.y + 10 * scale, b.radius, b.radius * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();

          if (b.trail.length > 1) {
            ctx.save();
            ctx.strokeStyle = b.isDeflected
              ? projSkin === 'arrow'
                ? '#F97316'
                : projSkin === 'laser'
                  ? '#A855F7'
                  : projSkin === 'tomato'
                    ? '#EF4444'
                    : b.color
              : b.color;
            ctx.lineCap = 'round';
            for (let t = 1; t < b.trail.length; t++) {
              const alpha = (t / b.trail.length) * (b.isDeflected ? 0.68 : 0.45);
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

          // If NOT deflected yet, draw the Enemy's Unique Weapon Projectile Design & Power Aura!
          if (!b.isDeflected && b.bulletType) {
            const pwr = b.powerLevel ?? 1;
            if (pwr >= 2) {
              ctx.strokeStyle = b.coreColor ?? '#FEF08A';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(0, 0, b.radius + 3.5, 0, Math.PI * 2);
              ctx.stroke();
            }

            if (b.bulletType === 'zombie_acid') {
              // Spinning Toxic Green Acid Spore / Bone Glob
              ctx.rotate(b.spinAngle);
              ctx.fillStyle = '#22C55E';
              ctx.strokeStyle = '#BEF264';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#14532D';
              ctx.beginPath();
              ctx.arc(-2, -2, 2, 0, Math.PI * 2);
              ctx.arc(2, 2, 1.8, 0, Math.PI * 2);
              ctx.fill();
            } else if (b.bulletType === 'alien_plasma') {
              // Alien Dual-Ring Plasma Orb
              ctx.rotate(moveAngle);
              ctx.fillStyle = '#A855F7';
              ctx.strokeStyle = '#38BDF8';
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.ellipse(0, 0, b.radius * 1.4, b.radius * 0.85, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#F3E8FF';
              ctx.beginPath();
              ctx.arc(0, 0, b.radius * 0.45, 0, Math.PI * 2);
              ctx.fill();
            } else if (b.bulletType === 'juggernaut_core') {
              // Heavy Magma Cannonball Core (Deals 2 Damage if not blocked!)
              ctx.fillStyle = '#991B1B';
              ctx.strokeStyle = '#EF4444';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.arc(0, 0, b.radius + 1.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#FDE047';
              ctx.beginPath();
              ctx.arc(0, 0, b.radius * 0.55, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Human Sniper Pointed Supersonic Brass Shell
              ctx.rotate(moveAngle);
              ctx.fillStyle = '#F59E0B';
              ctx.strokeStyle = '#FEF3C7';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(b.radius * 1.6, 0);
              ctx.lineTo(-b.radius, -b.radius * 0.75);
              ctx.lineTo(-b.radius, b.radius * 0.75);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
          } else if (projSkin === 'shuriken') {
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
      }

      // 13. Render Pooled Particles
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

      // 14. Render Floating Combat Texts
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

      // 15. Low-HP Peripheral Vignette
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
        aria-label="Orbit Deflect Bouncy Shield Arena"
        className="w-full h-full block outline-none cursor-crosshair"
      />
    </div>
  );
};
