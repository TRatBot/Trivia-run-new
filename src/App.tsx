/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArduinoModal } from './components/ArduinoModal';
import { CharacterSelectOverlay } from './components/CharacterSelectOverlay';
import { CustomModelsModal } from './components/CustomModelsModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PauseModal } from './components/PauseModal';
import { SplitScreenHUD } from './components/SplitScreenHUD';
import { TitleOverlay } from './components/TitleOverlay';
import { VictoryOverlay } from './components/VictoryOverlay';
import { ArduinoControllerManager } from './game/arduino';
import { templeAudio } from './game/audio';
import {
  addLeaderboardEntry,
  clearLeaderboard,
  isQualifyingLeaderboardTime,
  loadLeaderboard,
  saveLeaderboard,
} from './game/leaderboard';
import {
  beginRaceCountdown,
  buildHudSnapshot,
  createInitialRaceState,
  enterCharacterSelect,
  handlePlayerRaceAction,
  RaceEvent,
  returnToTitle,
  selectCharacterByIndex,
  setRaceMode,
  startRaceIfReady,
  stepRaceState,
  submitTriviaAnswer,
} from './game/raceLogic';
import {
  ArduinoStatus,
  CharacterId,
  CustomCharacterAsset,
  HudSnapshot,
  LeaderboardEntry,
  PlayerAction,
  PlayerId,
  RaceMode,
  RaceState,
} from './game/types';
import { TempleSceneController } from './three/TempleScene';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<TempleSceneController | null>(null);
  const arduinoRef = useRef<ArduinoControllerManager | null>(null);

  const raceStateRef = useRef<RaceState>(createInitialRaceState('demo', 4201));
  const lastHudSyncRef = useRef<number>(0);
  const pressedKeysRef = useRef<Set<string>>(new Set());

  const [hud, setHud] = useState<HudSnapshot>(() => buildHudSnapshot(raceStateRef.current));
  const [muted, setMuted] = useState(false);
  const [arduinoModalOpen, setArduinoModalOpen] = useState(false);
  const [customModelsOpen, setCustomModelsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => loadLeaderboard());
  const [savedVictoryEntryId, setSavedVictoryEntryId] = useState<string | null>(null);
  const [victorySaveSkipped, setVictorySaveSkipped] = useState(false);
  const [customAssets, setCustomAssets] = useState<
    Partial<Record<CharacterId, CustomCharacterAsset>>
  >({});
  const [arduinoStatus, setArduinoStatus] = useState<ArduinoStatus>({
    supported: typeof navigator !== 'undefined' && 'serial' in navigator,
    p1Connected: false,
    p2Connected: false,
    p1Label: 'Not connected',
    p2Label: 'Not connected',
    gamepadCount: 0,
    lastEvent: 'Keyboard backup ready',
  });

  const arduinoModalOpenRef = useRef(false);
  arduinoModalOpenRef.current = arduinoModalOpen || customModelsOpen || leaderboardOpen;

  const holdCelebrationRef = useRef(false);
  const leaderboardRef = useRef<LeaderboardEntry[]>(leaderboard);
  leaderboardRef.current = leaderboard;
  const savedVictoryEntryIdRef = useRef<string | null>(savedVictoryEntryId);
  savedVictoryEntryIdRef.current = savedVictoryEntryId;
  const victorySaveSkippedRef = useRef(victorySaveSkipped);
  victorySaveSkippedRef.current = victorySaveSkipped;

  const syncHudImmediate = useCallback(() => {
    const state = raceStateRef.current;
    document.body.dataset.state = state.phase;
    setHud(buildHudSnapshot(state));
  }, []);

  const handleRaceEvent = useCallback(
    (event: RaceEvent) => {
      templeAudio.handleEvent(event);
      sceneRef.current?.triggerEventEffects(event, raceStateRef.current);

      // Push immediate HUD update on discrete state-changing events
      if (
        event.type === 'obstacle_hit' ||
        event.type === 'trivia_start' ||
        event.type === 'trivia_choice_move' ||
        event.type === 'trivia_correct' ||
        event.type === 'trivia_wrong' ||
        event.type === 'trivia_penalty_end' ||
        event.type === 'countdown_tick' ||
        event.type === 'race_go' ||
        event.type === 'race_win' ||
        event.type === 'select_move' ||
        event.type === 'select_lock' ||
        event.type === 'select_blocked'
      ) {
        if (event.type === 'race_win' || event.type === 'race_go') {
          setSavedVictoryEntryId(null);
          setVictorySaveSkipped(false);
        }
        syncHudImmediate();
      }
    },
    [syncHudImmediate],
  );

  const dispatchAction = useCallback(
    (playerId: PlayerId, action: PlayerAction) => {
      if (arduinoModalOpenRef.current) return;
      const state = raceStateRef.current;
      if (state.phase === 'title' && action === 'select') {
        enterCharacterSelect(state);
        syncHudImmediate();
        return;
      }
      handlePlayerRaceAction(state, playerId, action, handleRaceEvent);
    },
    [handleRaceEvent, syncHudImmediate],
  );

  // Mount Three.js WebGL scene & Arduino manager ONCE (never recreated on HUD re-renders)
  useEffect(() => {
    const state = raceStateRef.current;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      enterCharacterSelect(state);
      selectCharacterByIndex(state, 0, 0, true);
      selectCharacterByIndex(state, 1, 1, false);
      beginRaceCountdown(state, undefined, true);
      const demoDist = Number(params.get('demoDist'));
      if (Number.isFinite(demoDist) && demoDist > 0) {
        const clampedDisp = Math.min(state.config.targetDisplayMeters - 5, demoDist);
        const phys = clampedDisp / state.config.displayMultiplier;
        // Place Player 1 right before the requested milestone while Player 2 trails slightly behind
        state.players[0].physicalDistance = phys;
        state.players[0].displayDistance = clampedDisp;
        state.players[1].physicalDistance = Math.max(0, phys - 12);
        state.players[1].displayDistance = state.players[1].physicalDistance * state.config.displayMultiplier;
        // Advance nextTriviaIndex past any earlier triggers so we test the target milestone cleanly
        state.players[0].nextTriviaIndex = state.config.triviaTriggerDisplayMeters.filter(
          (t) => t <= clampedDisp,
        ).length;
        state.players[1].nextTriviaIndex = state.config.triviaTriggerDisplayMeters.filter(
          (t) => t <= state.players[1].displayDistance,
        ).length;
      }
      if (params.get('demoWin') === '1') {
        const targetPhys = state.config.targetDisplayMeters / state.config.displayMultiplier;
        state.players[0].physicalDistance = targetPhys;
        state.players[0].displayDistance = state.config.targetDisplayMeters;
        state.players[0].triviaCorrectCount = 9;
        state.players[0].triviaTotalCount = 10;
        state.players[0].nextTriviaIndex = state.config.triviaTriggerDisplayMeters.length;
        state.players[1].physicalDistance = Math.max(0, targetPhys - 28);
        state.players[1].displayDistance = Math.round(
          state.players[1].physicalDistance * state.config.displayMultiplier,
        );
        state.players[1].triviaCorrectCount = 8;
        state.players[1].triviaTotalCount = 10;
        state.elapsedRaceTime = 64.25;
        state.winnerId = 0;
        state.phase = 'gameover';
        state.celebrationTimer = state.celebrationDuration;
      }
    }
    syncHudImmediate();

    const arduino = new ArduinoControllerManager(
      (playerId, action) => dispatchAction(playerId, action),
      (nextStatus) => setArduinoStatus(nextStatus),
    );
    arduinoRef.current = arduino;
    setArduinoStatus(arduino.getStatus());

    if (canvasMountRef.current) {
      const controller = new TempleSceneController(
        canvasMountRef.current,
        () => raceStateRef.current,
        (dt) => {
          arduinoRef.current?.pollGamepads();
          const current = raceStateRef.current;
          const prevPhase = current.phase;
          const waitingForLeaderboardInput =
            current.phase === 'gameover' &&
            !savedVictoryEntryIdRef.current &&
            !victorySaveSkippedRef.current &&
            isQualifyingLeaderboardTime(leaderboardRef.current, current.elapsedRaceTime);
          holdCelebrationRef.current =
            waitingForLeaderboardInput || arduinoModalOpenRef.current;
          stepRaceState(current, dt, handleRaceEvent, holdCelebrationRef.current);

          const now = performance.now();
          if (current.phase !== prevPhase || now - lastHudSyncRef.current >= 95) {
            lastHudSyncRef.current = now;
            document.body.dataset.state = current.phase;
            setHud(buildHudSnapshot(current));
          }
        },
      );
      sceneRef.current = controller;
    }

    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
      arduinoRef.current?.dispose();
      arduinoRef.current = null;
    };
  }, [dispatchAction, handleRaceEvent, syncHudImmediate]);

  // Unified Keyboard Input Hub (edge-triggered actions + clean blur release)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.repeat) return;
      const code = e.code;

      if (arduinoModalOpenRef.current) {
        if (code === 'Escape') {
          setArduinoModalOpen(false);
          setCustomModelsOpen(false);
          setLeaderboardOpen(false);
        }
        return;
      }

      if (pressedKeysRef.current.has(code)) return;
      pressedKeysRef.current.add(code);

      const state = raceStateRef.current;

      // Global utility keys
      if (code === 'KeyM') {
        const nextMuted = templeAudio.toggleMute();
        setMuted(nextMuted);
        return;
      }

      if (code === 'Escape' || code === 'KeyP') {
        if (state.phase === 'playing') {
          state.phase = 'paused';
          syncHudImmediate();
          return;
        }
        if (state.phase === 'paused') {
          state.phase = 'playing';
          syncHudImmediate();
          return;
        }
      }

      // Title screen start handshake (Enter or Space)
      if (state.phase === 'title') {
        if (code === 'Enter' || code === 'Space') {
          e.preventDefault();
          (document.activeElement as HTMLElement | null)?.blur();
          enterCharacterSelect(state);
          syncHudImmediate();
        }
        return;
      }

      // Character select Space shortcut once both players have locked in
      if (state.phase === 'select' && code === 'Space') {
        if (state.select.locked[0] && state.select.locked[1]) {
          e.preventDefault();
          startRaceIfReady(state, handleRaceEvent);
          syncHudImmediate();
        }
        return;
      }

      // Victory screen quick return (only after score is saved/skipped or non-qualifying)
      if (state.phase === 'gameover') {
        if (!holdCelebrationRef.current && (code === 'Enter' || code === 'Space')) {
          e.preventDefault();
          enterCharacterSelect(state);
          syncHudImmediate();
        }
        return;
      }

      // Player 1 Backup Controls: A / D (Left/Right), W (Jump), S / F (Select)
      if (code === 'KeyA') {
        dispatchAction(0, 'left');
      } else if (code === 'KeyD') {
        dispatchAction(0, 'right');
      } else if (code === 'KeyW') {
        dispatchAction(0, 'jump');
      } else if (code === 'KeyS' || code === 'KeyF') {
        dispatchAction(0, 'select');
      }

      // Player 2 Backup Controls: ArrowLeft / ArrowRight, ArrowUp (Jump), ArrowDown / Enter (Select)
      if (code === 'ArrowLeft') {
        e.preventDefault();
        dispatchAction(1, 'left');
      } else if (code === 'ArrowRight') {
        e.preventDefault();
        dispatchAction(1, 'right');
      } else if (code === 'ArrowUp') {
        e.preventDefault();
        dispatchAction(1, 'jump');
      } else if (code === 'ArrowDown' || code === 'Enter') {
        e.preventDefault();
        dispatchAction(1, 'select');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeysRef.current.delete(e.code);
    };

    const clearHeld = () => {
      pressedKeysRef.current.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHeld);
    document.addEventListener('visibilitychange', clearHeld);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearHeld);
      document.removeEventListener('visibilitychange', clearHeld);
    };
  }, [dispatchAction, syncHudImmediate]);

  // UI Handlers
  const handleStartSelect = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    enterCharacterSelect(raceStateRef.current);
    syncHudImmediate();
  };

  const handleQuickStart = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    const state = raceStateRef.current;
    enterCharacterSelect(state);
    state.select.cursors = [0, 1];
    state.select.locked = [true, true];
    beginRaceCountdown(state, handleRaceEvent, true);
    syncHudImmediate();
  };

  const handleSelectCard = (playerId: PlayerId, charIndex: number, lockImmediately: boolean) => {
    selectCharacterByIndex(
      raceStateRef.current,
      playerId,
      charIndex,
      lockImmediately,
      handleRaceEvent,
    );
    syncHudImmediate();
  };

  const handleToggleLock = (playerId: PlayerId) => {
    const state = raceStateRef.current;
    // Clicking "Unlock / Change" should always unlock that player even when both are locked
    if (state.phase === 'select' && state.select.locked[playerId]) {
      state.select.locked[playerId] = false;
      handleRaceEvent({ type: 'select_lock', playerId, locked: false });
      syncHudImmediate();
      return;
    }
    handlePlayerRaceAction(state, playerId, 'select', handleRaceEvent);
    syncHudImmediate();
  };

  const handlePreviewJump = (playerId: PlayerId) => {
    dispatchAction(playerId, 'jump');
  };

  const handleStartRaceFromSelect = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    startRaceIfReady(raceStateRef.current, handleRaceEvent);
    syncHudImmediate();
  };

  const handleChangeMode = (mode: RaceMode) => {
    setRaceMode(raceStateRef.current, mode);
    syncHudImmediate();
  };

  const handleTriviaAnswer = (playerId: PlayerId, choiceIndex: 0 | 1 | 2) => {
    submitTriviaAnswer(raceStateRef.current, playerId, choiceIndex, handleRaceEvent);
    syncHudImmediate();
  };

  const handlePause = () => {
    const state = raceStateRef.current;
    if (state.phase === 'playing') {
      state.phase = 'paused';
      syncHudImmediate();
    }
  };

  const handleResume = () => {
    const state = raceStateRef.current;
    if (state.phase === 'paused') {
      state.phase = 'playing';
      syncHudImmediate();
    }
  };

  const handleRestartRace = () => {
    beginRaceCountdown(raceStateRef.current, handleRaceEvent, false);
    syncHudImmediate();
  };

  const handleReturnTitle = () => {
    returnToTitle(raceStateRef.current);
    syncHudImmediate();
  };

  const handleToggleMute = () => {
    setMuted(templeAudio.toggleMute());
  };

  const handleSaveWinnerScore = (playerName: string) => {
    const state = raceStateRef.current;
    const winnerIdx = state.winnerId ?? 0;
    const winner = state.players[winnerIdx];
    const snap = buildHudSnapshot(state);
    const { entries, entry } = addLeaderboardEntry(leaderboardRef.current, {
      playerName,
      characterId: winner.characterId,
      characterName: snap.players[winnerIdx].characterName,
      timeSeconds: state.elapsedRaceTime,
      mode: state.config.mode,
      riddlesCorrect: winner.triviaCorrectCount,
      riddlesTotal: winner.triviaTotalCount || state.config.triviaTriggerDisplayMeters.length,
    });
    saveLeaderboard(entries);
    setLeaderboard(entries);
    setSavedVictoryEntryId(entry.id);
    setVictorySaveSkipped(false);
  };

  const handleClearLeaderboard = () => {
    const empty = clearLeaderboard();
    setLeaderboard(empty);
    setSavedVictoryEntryId(null);
  };

  const handleUploadCustomAsset = (charId: CharacterId, file: File) => {
    const ext = file.name.toLowerCase();
    const kind: CustomCharacterAsset['kind'] =
      ext.endsWith('.glb') || ext.endsWith('.gltf') ? 'glb' : 'image';
    const url = URL.createObjectURL(file);
    const asset: CustomCharacterAsset = { kind, url, fileName: file.name };

    setCustomAssets((prev) => {
      const old = prev[charId];
      if (old) URL.revokeObjectURL(old.url);
      return { ...prev, [charId]: asset };
    });
    sceneRef.current?.setCustomCharacterAsset(charId, asset);
  };

  const handleResetCustomAsset = (charId: CharacterId) => {
    setCustomAssets((prev) => {
      const old = prev[charId];
      if (old) URL.revokeObjectURL(old.url);
      const next = { ...prev };
      delete next[charId];
      return next;
    });
    sceneRef.current?.setCustomCharacterAsset(charId, null);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-gradient-to-b from-[#d8b884] via-[#c79c64] to-[#2e4b36]">
      {/* Isolated WebGL Three.js Viewport Container (never re-rendered by HUD state) */}
      <div
        ref={canvasMountRef}
        data-testid="temple-webgl-canvas"
        className="fixed inset-0 w-full h-full"
      />

      {/* Screen Overlays driven by Game State Machine */}
      {hud.phase === 'title' && (
        <TitleOverlay
          onStartSelect={handleStartSelect}
          onQuickStart={handleQuickStart}
          onOpenArduino={() => setArduinoModalOpen(true)}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          leaderboardCount={leaderboard.length}
          arduinoStatus={arduinoStatus}
        />
      )}

      {(hud.phase === 'select' || hud.phase === 'countdown') && (
        <CharacterSelectOverlay
          hud={hud}
          customAssets={customAssets}
          onSelectCard={handleSelectCard}
          onToggleLock={handleToggleLock}
          onPreviewJump={handlePreviewJump}
          onStartRace={handleStartRaceFromSelect}
          onChangeMode={handleChangeMode}
          onBackToTitle={handleReturnTitle}
          onOpenArduino={() => setArduinoModalOpen(true)}
          onOpenCustomModels={() => setCustomModelsOpen(true)}
        />
      )}

      {(hud.phase === 'playing' || hud.phase === 'paused') && (
        <SplitScreenHUD
          hud={hud}
          customAssets={customAssets}
          muted={muted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onOpenArduino={() => setArduinoModalOpen(true)}
          onTriviaAnswer={handleTriviaAnswer}
        />
      )}

      {hud.phase === 'paused' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestartRace}
          onReturnTitle={handleReturnTitle}
        />
      )}

      {hud.phase === 'gameover' && (
        <VictoryOverlay
          hud={hud}
          customAssets={customAssets}
          leaderboard={leaderboard}
          savedEntryId={savedVictoryEntryId}
          onSaveWinnerScore={handleSaveWinnerScore}
          onSkipSave={() => setVictorySaveSkipped(true)}
          onRaceAgain={() => {
            setSavedVictoryEntryId(null);
            setVictorySaveSkipped(false);
            handleStartSelect();
          }}
          onReturnTitle={() => {
            setSavedVictoryEntryId(null);
            setVictorySaveSkipped(false);
            handleReturnTitle();
          }}
        />
      )}

      {leaderboardOpen && (
        <LeaderboardModal
          entries={leaderboard}
          customAssets={customAssets}
          onClear={handleClearLeaderboard}
          onClose={() => setLeaderboardOpen(false)}
        />
      )}

      {arduinoModalOpen && (
        <ArduinoModal
          status={arduinoStatus}
          onConnect={(pId) => {
            void arduinoRef.current?.connectPort(pId);
          }}
          onDisconnect={(pId) => {
            void arduinoRef.current?.disconnectPort(pId);
          }}
          onClose={() => setArduinoModalOpen(false)}
        />
      )}

      {customModelsOpen && (
        <CustomModelsModal
          customAssets={customAssets}
          onUploadAsset={handleUploadCustomAsset}
          onResetAsset={handleResetCustomAsset}
          onClose={() => setCustomModelsOpen(false)}
        />
      )}

      <OfflineIndicator />
    </main>
  );
}
