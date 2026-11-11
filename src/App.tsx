import { useCallback, useEffect, useState } from 'react';
import { ArenaCanvas, GamePhase } from './components/ArenaCanvas';
import { GameHud, HudSnapshot } from './components/GameHud';
import { ShopModal } from './components/ShopModal';
import { RunSummarySnapshot, StatusModal } from './components/StatusModal';
import { TitleOverlay } from './components/TitleOverlay';
import {
  CharacterSkinId,
  GameMode,
  loadPlayerProfile,
  ProjectileSkinId,
  savePlayerProfile,
  ShieldSkinId,
  TrailSkinId,
  UnlockedStoreState,
} from './game/catalog';
import { ShieldStanceId } from './game/physics';
import { soundEngine } from './game/audio';

function getInitialPhase(): GamePhase {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      return 'playing';
    }
  }
  return 'title';
}

export default function App() {
  const [gamePhase, setGamePhase] = useState<GamePhase>(getInitialPhase);
  const [gameMode, setGameMode] = useState<GameMode>('level');
  const [profile, setProfile] = useState<UnlockedStoreState>(() => loadPlayerProfile());
  const [selectedLevel, setSelectedLevel] = useState<number>(() =>
    loadPlayerProfile().highestUnlockedLevel
  );
  const [selectedStance, setSelectedStance] = useState<ShieldStanceId>('brass');
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [runNonce, setRunNonce] = useState<number>(1);

  const [hud, setHud] = useState<HudSnapshot>(() => ({
    gameMode: 'level',
    hp: 5,
    maxHp: 5,
    crackedSocketIndex: -1,
    score: 0,
    bestScore: Number(localStorage.getItem('orbit_deflect_best') || '0') || 0,
    coins: loadPlayerProfile().coins,
    combo: 1,
    level: 1,
    enemiesRemaining: 4,
    deflections: 0,
    pulseCooldown: 0,
    dualShieldTimer: 0,
    tripleWeaponTimer: 0,
    stance: 'brass',
    muted: false,
  }));

  const [runSummary, setRunSummary] = useState<RunSummarySnapshot>({
    outcome: 'defeat',
    gameMode: 'level',
    score: 0,
    bestScore: 0,
    levelReached: 1,
    coinsEarned: 0,
    deflections: 0,
    bankKills: 0,
  });

  useEffect(() => {
    document.body.dataset.state = gamePhase;
  }, [gamePhase]);

  const updateProfile = useCallback(
    (updater: (prev: UnlockedStoreState) => UnlockedStoreState) => {
      setProfile((prev) => {
        const next = updater(prev);
        savePlayerProfile(next);
        return next;
      });
    },
    []
  );

  const handleAddCoins = useCallback(
    (amount: number) => {
      updateProfile((prev) => ({
        ...prev,
        coins: prev.coins + amount,
      }));
    },
    [updateProfile]
  );

  const handleLevelComplete = useCallback(
    (completedLevel: number) => {
      const nextUnlock = Math.min(100, completedLevel + 1);
      updateProfile((prev) => ({
        ...prev,
        highestUnlockedLevel: Math.max(prev.highestUnlockedLevel, nextUnlock),
      }));
    },
    [updateProfile]
  );

  const startNewRun = useCallback(() => {
    setIsShopOpen(false);
    document.body.dataset.state = 'playing';
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setRunNonce((n) => n + 1);
    setGamePhase('playing');
    const canvas = document.querySelector('canvas');
    if (canvas instanceof HTMLElement) {
      canvas.focus();
    }
  }, []);

  const handleNextLevel = useCallback(() => {
    const nextLvl = Math.min(100, selectedLevel + 1);
    setSelectedLevel(nextLvl);
    setIsShopOpen(false);
    document.body.dataset.state = 'playing';
    setRunNonce((n) => n + 1);
    setGamePhase('playing');
  }, [selectedLevel]);

  const handleTogglePause = useCallback(() => {
    setGamePhase((prev) => {
      if (prev === 'playing') {
        document.body.dataset.state = 'paused';
        setRunSummary({
          outcome: 'defeat',
          gameMode,
          score: hud.score,
          bestScore: hud.bestScore,
          levelReached: hud.level,
          coinsEarned: 0,
          deflections: hud.deflections,
          bankKills: 0,
        });
        return 'paused';
      }
      if (prev === 'paused') {
        document.body.dataset.state = 'playing';
        return 'playing';
      }
      return prev;
    });
  }, [gameMode, hud.bestScore, hud.deflections, hud.level, hud.score]);

  const handleGameOver = useCallback((summary: RunSummarySnapshot) => {
    document.body.dataset.state = 'gameover';
    setRunSummary(summary);
    setGamePhase('gameover');
  }, []);

  const handleReturnTitle = useCallback(() => {
    setIsShopOpen(false);
    document.body.dataset.state = 'title';
    setGamePhase('title');
  }, []);

  const handleToggleMute = useCallback(() => {
    soundEngine.muted = !soundEngine.muted;
    setHud((prev) => ({ ...prev, muted: soundEngine.muted }));
  }, []);

  const handleSelectStance = useCallback((stance: ShieldStanceId) => {
    setSelectedStance(stance);
    setHud((prev) => ({ ...prev, stance }));
  }, []);

  // Shop Buy / Equip Handlers
  const handleBuyOrEquipCharacter = useCallback(
    (id: CharacterSkinId, price: number) => {
      updateProfile((prev) => {
        const unlocked = prev.unlockedCharacters.includes(id);
        if (unlocked) {
          return { ...prev, loadout: { ...prev.loadout, character: id } };
        }
        if (prev.coins < price) return prev;
        soundEngine.playGiftPickup();
        return {
          ...prev,
          coins: prev.coins - price,
          unlockedCharacters: [...prev.unlockedCharacters, id],
          loadout: { ...prev.loadout, character: id },
        };
      });
    },
    [updateProfile]
  );

  const handleBuyOrEquipShield = useCallback(
    (id: ShieldSkinId, price: number) => {
      updateProfile((prev) => {
        const unlocked = prev.unlockedShields.includes(id);
        if (unlocked) {
          return { ...prev, loadout: { ...prev.loadout, shield: id } };
        }
        if (prev.coins < price) return prev;
        soundEngine.playGiftPickup();
        return {
          ...prev,
          coins: prev.coins - price,
          unlockedShields: [...prev.unlockedShields, id],
          loadout: { ...prev.loadout, shield: id },
        };
      });
    },
    [updateProfile]
  );

  const handleBuyOrEquipProjectile = useCallback(
    (id: ProjectileSkinId, price: number) => {
      updateProfile((prev) => {
        const unlocked = prev.unlockedProjectiles.includes(id);
        if (unlocked) {
          return { ...prev, loadout: { ...prev.loadout, projectile: id } };
        }
        if (prev.coins < price) return prev;
        soundEngine.playGiftPickup();
        return {
          ...prev,
          coins: prev.coins - price,
          unlockedProjectiles: [...prev.unlockedProjectiles, id],
          loadout: { ...prev.loadout, projectile: id },
        };
      });
    },
    [updateProfile]
  );

  const handleBuyOrEquipTrail = useCallback(
    (id: TrailSkinId, price: number) => {
      updateProfile((prev) => {
        const unlocked = prev.unlockedTrails.includes(id);
        if (unlocked) {
          return { ...prev, loadout: { ...prev.loadout, trail: id } };
        }
        if (prev.coins < price) return prev;
        soundEngine.playGiftPickup();
        return {
          ...prev,
          coins: prev.coins - price,
          unlockedTrails: [...prev.unlockedTrails, id],
          loadout: { ...prev.loadout, trail: id },
        };
      });
    },
    [updateProfile]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isShopOpen) {
        if (e.code === 'Escape') {
          setIsShopOpen(false);
        }
        return;
      }
      if (gamePhase === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startNewRun();
        }
      } else if (gamePhase === 'playing') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          handleTogglePause();
        } else if (e.code === 'KeyR') {
          e.preventDefault();
          startNewRun();
        }
      } else if (gamePhase === 'paused') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          e.preventDefault();
          handleTogglePause();
        }
      } else if (gamePhase === 'gameover') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startNewRun();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gamePhase, handleTogglePause, isShopOpen, startNewRun]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0B0F17] select-none">
      <ArenaCanvas
        gamePhase={gamePhase}
        gameMode={gameMode}
        selectedLevel={selectedLevel}
        selectedStance={selectedStance}
        loadout={profile.loadout}
        totalCoins={profile.coins}
        runNonce={runNonce}
        onHudUpdate={setHud}
        onAddCoins={handleAddCoins}
        onLevelComplete={handleLevelComplete}
        onGameOver={handleGameOver}
        onTogglePause={handleTogglePause}
        onSelectStance={handleSelectStance}
      />

      {gamePhase === 'title' && !isShopOpen && (
        <TitleOverlay
          gameMode={gameMode}
          selectedLevel={selectedLevel}
          highestUnlockedLevel={profile.highestUnlockedLevel}
          coins={profile.coins}
          bestScore={hud.bestScore}
          onSelectMode={setGameMode}
          onSelectLevel={setSelectedLevel}
          onOpenShop={() => setIsShopOpen(true)}
          onStartGame={startNewRun}
        />
      )}

      {(gamePhase === 'playing' || gamePhase === 'paused') && (
        <GameHud
          hud={hud}
          onSelectStance={handleSelectStance}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onRestart={startNewRun}
        />
      )}

      {(gamePhase === 'paused' || gamePhase === 'gameover') && !isShopOpen && (
        <StatusModal
          mode={gamePhase}
          summary={runSummary}
          onResume={handleTogglePause}
          onRestart={startNewRun}
          onNextLevel={handleNextLevel}
          onOpenShop={() => setIsShopOpen(true)}
          onReturnTitle={handleReturnTitle}
        />
      )}

      {isShopOpen && (
        <ShopModal
          profile={profile}
          onBuyOrEquipCharacter={handleBuyOrEquipCharacter}
          onBuyOrEquipShield={handleBuyOrEquipShield}
          onBuyOrEquipProjectile={handleBuyOrEquipProjectile}
          onBuyOrEquipTrail={handleBuyOrEquipTrail}
          onClose={() => setIsShopOpen(false)}
        />
      )}
    </main>
  );
}
