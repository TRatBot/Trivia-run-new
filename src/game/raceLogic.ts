import {
  ANCIENT_PRAISE_LINES,
  ANCIENT_WRONG_QUIPS,
  CHARACTERS,
  MONSTERS,
  TRIVIA_QUESTIONS,
  getCharacterById,
} from './data';
import {
  CharacterId,
  HudSnapshot,
  LaneIndex,
  ObstacleDef,
  PlayerAction,
  PlayerId,
  PlayerState,
  RaceConfig,
  RaceMode,
  RaceState,
  TriviaQuestion,
} from './types';

export const LANE_SPACING = 2.3; // World units between lane centers
export const GRAVITY = 38.0; // Snappy high-speed gravity (world units/s^2)
export const JUMP_VELOCITY = 13.8; // Crisp athletic ~2.5m jump apex (~0.72s air time)
export const CELEBRATION_SECONDS = 8.0;

export const TEN_RIDDLE_DISPLAY_TRIGGERS: number[] = [
  270, 540, 810, 1080, 1350, 1620, 1890, 2160, 2430, 2700,
];

export type RaceEvent =
  | { type: 'lane_shift'; playerId: PlayerId }
  | { type: 'jump'; playerId: PlayerId }
  | { type: 'land'; playerId: PlayerId }
  | { type: 'obstacle_hit'; playerId: PlayerId; obstacle: ObstacleDef }
  | { type: 'trivia_start'; playerId: PlayerId; monsterName: string }
  | { type: 'trivia_choice_move'; playerId: PlayerId }
  | { type: 'trivia_correct'; playerId: PlayerId; line: string }
  | { type: 'trivia_wrong'; playerId: PlayerId }
  | { type: 'trivia_penalty_end'; playerId: PlayerId }
  | { type: 'countdown_tick'; value: number }
  | { type: 'race_go' }
  | { type: 'race_win'; winnerId: PlayerId }
  | { type: 'select_move'; playerId: PlayerId }
  | { type: 'select_lock'; playerId: PlayerId; locked: boolean }
  | { type: 'select_preview'; playerId: PlayerId }
  | { type: 'select_blocked'; playerId: PlayerId };

export function createRaceConfig(mode: RaceMode): RaceConfig {
  if (mode === 'full') {
    // Full 3,000 m marathon: fast 9.0 m/s sprint + 10 distinct riddles for each player
    return {
      mode: 'full',
      targetDisplayMeters: 3000,
      physicalTargetMeters: 3000,
      displayMultiplier: 1,
      baseSpeed: 9.0,
      penaltySpeed: 4.0,
      recoveryDuration: 2.0,
      wrongTriviaPenaltySeconds: 5.0,
      triviaTriggerDisplayMeters: [...TEN_RIDDLE_DISPLAY_TRIGGERS],
      worldUnitsPerPhysicalMeter: 2.8,
    };
  }
  // Fast Fair Sprint: 9.0 m/s high-speed 500m physical run (6x display -> 3,000 m) + 10 riddles each
  return {
    mode: 'demo',
    targetDisplayMeters: 3000,
    physicalTargetMeters: 500,
    displayMultiplier: 6,
    baseSpeed: 9.0,
    penaltySpeed: 4.0,
    recoveryDuration: 2.0,
    wrongTriviaPenaltySeconds: 5.0,
    triviaTriggerDisplayMeters: [...TEN_RIDDLE_DISPLAY_TRIGGERS],
    worldUnitsPerPhysicalMeter: 2.8,
  };
}

/** Deterministic PRNG (Mulberry32) so both players share the exact same fair obstacle layout */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates high-tempo, reaction-testing temple obstacle & broken-path patterns along the track.
 * Guarantees:
 * - Safe start runway (first 18 physical meters clear)
 * - Safe buffer around every riddle monster plaza (+/- 7.5 physical meters)
 * - Safe runway approaching the finish gate (last 14 physical meters)
 * - Every hazard row is 100% passable via open lane or jump
 */
export function generateObstacles(config: RaceConfig, seed: number): ObstacleDef[] {
  const rng = mulberry32(seed);
  const obstacles: ObstacleDef[] = [];
  const triggerPhysicalZs = config.triviaTriggerDisplayMeters.map(
    (d) => d / config.displayMultiplier,
  );

  const safeStartZ = 18;
  const safeEndZ = config.physicalTargetMeters - 14;
  const stepMin = 9.5;
  const stepMax = 13.5;

  let z = safeStartZ;
  let patternIndex = 0;

  while (z < safeEndZ) {
    const nearTrivia = triggerPhysicalZs.some((tz) => Math.abs(z - tz) < 7.5);
    if (nearTrivia) {
      z += 8.0;
      continue;
    }

    const lanes: LaneIndex[] = [-1, 0, 1];
    const cycle = patternIndex % 7;

    if (cycle === 0) {
      // Broken path chasm in 1 or 2 lanes (sidestep to solid stone OR leap cleanly across!)
      const openIdx = Math.floor(rng() * 3);
      const twoGaps = rng() > 0.35;
      lanes.forEach((lane, idx) => {
        if (idx === openIdx) return;
        if (!twoGaps && idx === (openIdx + 2) % 3) return;
        obstacles.push({
          id: `obs_${patternIndex}_gap_${idx}`,
          physicalZ: z,
          lane,
          spansAllLanes: false,
          kind: 'broken_path_lane',
          jumpable: true,
          height: 0.35,
          physicalLength: 1.45,
        });
      });
    } else if (cycle === 1) {
      // Two tall temple totems leaving exactly one rapid-reaction open lane
      const openLaneIdx = Math.floor(rng() * 3);
      lanes.forEach((lane, idx) => {
        if (idx !== openLaneIdx) {
          obstacles.push({
            id: `obs_${patternIndex}_totem_${idx}`,
            physicalZ: z,
            lane,
            spansAllLanes: false,
            kind: 'tall_totem',
            jumpable: false,
            height: 2.3,
          });
        }
      });
    } else if (cycle === 2) {
      // Full-width broken causeway bridge chasm across ALL 3 lanes (must JUMP!)
      obstacles.push({
        id: `obs_${patternIndex}_fullgap`,
        physicalZ: z,
        lane: 0,
        spansAllLanes: true,
        kind: 'broken_path_full',
        jumpable: true,
        height: 0.35,
        physicalLength: 1.5,
      });
    } else if (cycle === 3) {
      // Tall totem + low stone pillar combo (either dodge to open lane OR leap the pillar)
      const tallLaneIdx = Math.floor(rng() * 3);
      const lowLaneIdx = (tallLaneIdx + 1) % 3;
      obstacles.push({
        id: `obs_${patternIndex}_tall`,
        physicalZ: z,
        lane: lanes[tallLaneIdx],
        spansAllLanes: false,
        kind: 'tall_totem',
        jumpable: false,
        height: 2.3,
      });
      obstacles.push({
        id: `obs_${patternIndex}_low`,
        physicalZ: z,
        lane: lanes[lowLaneIdx],
        spansAllLanes: false,
        kind: 'low_pillar',
        jumpable: true,
        height: 0.9,
      });
    } else if (cycle === 4) {
      // Full-width jungle vine hurdle bar (clear JUMP cue across all 3 lanes)
      obstacles.push({
        id: `obs_${patternIndex}_hurdle`,
        physicalZ: z,
        lane: 0,
        spansAllLanes: true,
        kind: 'vine_hurdle',
        jumpable: true,
        height: 0.85,
      });
    } else if (cycle === 5) {
      // Tall totem + broken path chasm combo (1 safe lane, 1 jumpable chasm, 1 solid wall!)
      const tallIdx = Math.floor(rng() * 3);
      const gapIdx = (tallIdx + 1) % 3;
      obstacles.push({
        id: `obs_${patternIndex}_totem`,
        physicalZ: z,
        lane: lanes[tallIdx],
        spansAllLanes: false,
        kind: 'tall_totem',
        jumpable: false,
        height: 2.3,
      });
      obstacles.push({
        id: `obs_${patternIndex}_gap`,
        physicalZ: z,
        lane: lanes[gapIdx],
        spansAllLanes: false,
        kind: 'broken_path_lane',
        jumpable: true,
        height: 0.35,
        physicalLength: 1.45,
      });
    } else {
      // Double low carved stone drums (2 jumpable lanes + 1 open lane)
      const openIdx = Math.floor(rng() * 3);
      lanes.forEach((lane, idx) => {
        if (idx !== openIdx) {
          obstacles.push({
            id: `obs_${patternIndex}_low_${idx}`,
            physicalZ: z,
            lane,
            spansAllLanes: false,
            kind: 'low_pillar',
            jumpable: true,
            height: 0.9,
          });
        }
      });
    }

    patternIndex += 1;
    z += stepMin + rng() * (stepMax - stepMin);
  }

  return obstacles;
}

export function createInitialPlayerState(
  id: PlayerId,
  characterId: CharacterId,
  baseSpeed = 9.0,
): PlayerState {
  return {
    id,
    characterId,
    lane: 0,
    laneX: 0,
    physicalDistance: 0,
    displayDistance: 0,
    speed: baseSpeed,
    slowRecoveryTimer: 0,
    hitInvulnTimer: 0,
    hitFlashTimer: 0,
    hitstopTimer: 0,
    cameraShake: 0,
    y: 0,
    vy: 0,
    grounded: true,
    jumpBufferTimer: 0,
    coyoteTimer: 0,
    stridePhase: 0,
    squashX: 1,
    squashY: 1,
    hitObstacleIds: [],
    nextTriviaIndex: 0,
    activeTrivia: null,
    praiseBanner: null,
    obstaclesHitCount: 0,
    triviaCorrectCount: 0,
    triviaTotalCount: 0,
    finished: false,
    finishTime: null,
  };
}

export function createInitialRaceState(mode: RaceMode = 'demo', seed = 4201): RaceState {
  const config = createRaceConfig(mode);
  return {
    phase: 'title',
    config,
    seed,
    elapsedRaceTime: 0,
    countdownTimer: 3.0,
    celebrationTimer: CELEBRATION_SECONDS,
    celebrationDuration: CELEBRATION_SECONDS,
    winnerId: null,
    select: {
      cursors: [0, 1],
      locked: [false, false],
      mode,
    },
    obstacles: generateObstacles(config, seed),
    players: [
      createInitialPlayerState(0, CHARACTERS[0].id, config.baseSpeed),
      createInitialPlayerState(1, CHARACTERS[1].id, config.baseSpeed),
    ],
  };
}

/**
 * Pick a deterministic, non-repeating riddle for (playerId, encounterIndex).
 * Splits the 28-riddle deck into two disjoint 14-riddle halves so Player 1 and Player 2
 * each get 10 unique riddles with zero overlap between players!
 */
export function getTriviaQuestionForEncounter(
  seed: number,
  playerId: PlayerId,
  encounterIndex: number,
): TriviaQuestion {
  const half = Math.floor(TRIVIA_QUESTIONS.length / 2);
  const baseOffset = playerId === 0 ? 0 : half;
  const startInHalf = (Math.abs(seed) + playerId * 5) % half;
  const idx = baseOffset + ((startInHalf + encounterIndex) % half);
  return TRIVIA_QUESTIONS[idx];
}

export function getPraiseLine(seed: number, playerId: PlayerId, encounterIndex: number): string {
  const idx =
    (Math.abs(seed) + playerId * 3 + encounterIndex) % ANCIENT_PRAISE_LINES.length;
  return ANCIENT_PRAISE_LINES[idx];
}

export function getWrongQuip(seed: number, playerId: PlayerId, encounterIndex: number): string {
  const idx =
    (Math.abs(seed) + playerId * 2 + encounterIndex) % ANCIENT_WRONG_QUIPS.length;
  return ANCIENT_WRONG_QUIPS[idx];
}

/** Check if a character index is currently locked by the opponent */
export function isCharacterTakenByOpponent(
  state: RaceState,
  playerId: PlayerId,
  charIndex: number,
): boolean {
  const otherId: PlayerId = playerId === 0 ? 1 : 0;
  return state.select.locked[otherId] && state.select.cursors[otherId] === charIndex;
}

/** Character selection actions (Left, Right, Jump=Preview, Select=Lock/Unlock/Start) with strict uniqueness */
export function handleCharacterSelectAction(
  state: RaceState,
  playerId: PlayerId,
  action: PlayerAction,
  emit?: (e: RaceEvent) => void,
): void {
  if (state.phase !== 'select') return;

  if (action === 'jump') {
    emit?.({ type: 'select_preview', playerId });
    return;
  }

  if (action === 'left' || action === 'right') {
    if (state.select.locked[playerId]) return; // Locked players must unlock first
    const dir = action === 'right' ? 1 : -1;
    let next = (state.select.cursors[playerId] + dir + CHARACTERS.length) % CHARACTERS.length;
    // Skip past opponent's locked character automatically for smooth fair UX
    if (isCharacterTakenByOpponent(state, playerId, next)) {
      next = (next + dir + CHARACTERS.length) % CHARACTERS.length;
    }
    state.select.cursors[playerId] = next;
    state.players[playerId].characterId = CHARACTERS[next].id;
    emit?.({ type: 'select_move', playerId });
    return;
  }

  if (action === 'select') {
    // If both players are already locked & previewing their matchup, pressing Select starts the race!
    if (state.select.locked[0] && state.select.locked[1]) {
      beginRaceCountdown(state, emit);
      return;
    }

    if (state.select.locked[playerId]) {
      // Allow toggling unlock before race starts so player can preview another character
      state.select.locked[playerId] = false;
      emit?.({ type: 'select_lock', playerId, locked: false });
      return;
    }

    const desired = state.select.cursors[playerId];
    if (isCharacterTakenByOpponent(state, playerId, desired)) {
      // Blocked: opponent already locked this character
      emit?.({ type: 'select_blocked', playerId });
      return;
    }

    state.select.locked[playerId] = true;
    state.players[playerId].characterId = CHARACTERS[desired].id;
    emit?.({ type: 'select_lock', playerId, locked: true });

    // If opponent's unlocked cursor was sitting on the newly locked character, nudge it to a free slot
    const otherId: PlayerId = playerId === 0 ? 1 : 0;
    if (!state.select.locked[otherId] && state.select.cursors[otherId] === desired) {
      const freeIdx = CHARACTERS.findIndex((_, idx) => idx !== desired);
      if (freeIdx >= 0) {
        state.select.cursors[otherId] = freeIdx;
        state.players[otherId].characterId = CHARACTERS[freeIdx].id;
      }
    }
  }
}

export function selectCharacterByIndex(
  state: RaceState,
  playerId: PlayerId,
  charIndex: number,
  lockImmediately: boolean,
  emit?: (e: RaceEvent) => void,
): boolean {
  if (state.phase !== 'select') return false;
  if (charIndex < 0 || charIndex >= CHARACTERS.length) return false;
  if (isCharacterTakenByOpponent(state, playerId, charIndex)) {
    emit?.({ type: 'select_blocked', playerId });
    return false;
  }
  state.select.cursors[playerId] = charIndex;
  state.players[playerId].characterId = CHARACTERS[charIndex].id;
  if (lockImmediately) {
    state.select.locked[playerId] = true;
    emit?.({ type: 'select_lock', playerId, locked: true });
    const otherId: PlayerId = playerId === 0 ? 1 : 0;
    if (!state.select.locked[otherId] && state.select.cursors[otherId] === charIndex) {
      const freeIdx = CHARACTERS.findIndex((_, idx) => idx !== charIndex);
      if (freeIdx >= 0) {
        state.select.cursors[otherId] = freeIdx;
        state.players[otherId].characterId = CHARACTERS[freeIdx].id;
      }
    }
  } else {
    state.select.locked[playerId] = false;
    emit?.({ type: 'select_move', playerId });
  }
  return true;
}

export function startRaceIfReady(
  state: RaceState,
  emit?: (e: RaceEvent) => void,
  skipCountdown = false,
): boolean {
  if (state.phase !== 'select') return false;
  if (!state.select.locked[0] || !state.select.locked[1]) return false;
  if (state.select.cursors[0] === state.select.cursors[1]) return false;
  beginRaceCountdown(state, emit, skipCountdown);
  return true;
}

export function setRaceMode(state: RaceState, mode: RaceMode): void {
  state.select.mode = mode;
  state.config = createRaceConfig(mode);
  state.obstacles = generateObstacles(state.config, state.seed);
}

export function enterCharacterSelect(state: RaceState): void {
  state.phase = 'select';
  state.select.locked = [false, false];
  // Keep distinct default cursors
  if (state.select.cursors[0] === state.select.cursors[1]) {
    state.select.cursors[1] = (state.select.cursors[0] + 1) % CHARACTERS.length;
  }
  state.players[0].characterId = CHARACTERS[state.select.cursors[0]].id;
  state.players[1].characterId = CHARACTERS[state.select.cursors[1]].id;
}

export function beginRaceCountdown(
  state: RaceState,
  emit?: (e: RaceEvent) => void,
  skipCountdown = false,
): void {
  const newSeed = ((state.seed * 1664525 + 1013904223) >>> 0) % 100000;
  state.seed = newSeed === 0 ? 4201 : newSeed;
  state.config = createRaceConfig(state.select.mode);
  state.obstacles = generateObstacles(state.config, state.seed);

  const p0Char = CHARACTERS[state.select.cursors[0]].id;
  const p1Char = CHARACTERS[state.select.cursors[1]].id;
  state.players = [
    createInitialPlayerState(0, p0Char, state.config.baseSpeed),
    createInitialPlayerState(1, p1Char, state.config.baseSpeed),
  ];
  state.elapsedRaceTime = 0;
  state.winnerId = null;
  state.celebrationTimer = CELEBRATION_SECONDS;

  if (skipCountdown) {
    state.countdownTimer = 0;
    state.phase = 'playing';
    emit?.({ type: 'race_go' });
  } else {
    state.countdownTimer = 2.6;
    state.phase = 'countdown';
    emit?.({ type: 'countdown_tick', value: 3 });
  }
}

export function returnToTitle(state: RaceState): void {
  state.phase = 'title';
  state.select.locked = [false, false];
  state.winnerId = null;
  state.elapsedRaceTime = 0;
  state.celebrationTimer = CELEBRATION_SECONDS;
}

/** Handle in-race player actions (lane shift, jump, trivia navigation/confirm) */
export function handlePlayerRaceAction(
  state: RaceState,
  playerId: PlayerId,
  action: PlayerAction,
  emit?: (e: RaceEvent) => void,
): void {
  if (state.phase === 'select') {
    handleCharacterSelectAction(state, playerId, action, emit);
    return;
  }
  if (state.phase !== 'playing') return;

  const player = state.players[playerId];
  if (player.finished) return;

  // If this player is paused at a Trivia Monster encounter, route Left/Right/Select to Trivia!
  if (player.activeTrivia) {
    if (player.activeTrivia.outcome === 'asking') {
      if (action === 'left') {
        player.activeTrivia.selectedChoice = ((player.activeTrivia.selectedChoice + 2) % 3) as
          | 0
          | 1
          | 2;
        emit?.({ type: 'trivia_choice_move', playerId });
      } else if (action === 'right') {
        player.activeTrivia.selectedChoice = ((player.activeTrivia.selectedChoice + 1) % 3) as
          | 0
          | 1
          | 2;
        emit?.({ type: 'trivia_choice_move', playerId });
      } else if (action === 'select') {
        submitTriviaAnswer(state, playerId, player.activeTrivia.selectedChoice, emit);
      }
    }
    return;
  }

  // Normal running controls
  if (action === 'left') {
    if (player.lane > -1) {
      player.lane = (player.lane - 1) as LaneIndex;
      emit?.({ type: 'lane_shift', playerId });
    }
  } else if (action === 'right') {
    if (player.lane < 1) {
      player.lane = (player.lane + 1) as LaneIndex;
      emit?.({ type: 'lane_shift', playerId });
    }
  } else if (action === 'jump') {
    player.jumpBufferTimer = 0.14;
    tryExecuteJump(player, emit);
  }
}

export function submitTriviaAnswer(
  state: RaceState,
  playerId: PlayerId,
  choiceIndex: 0 | 1 | 2,
  emit?: (e: RaceEvent) => void,
): void {
  if (state.phase !== 'playing') return;
  const player = state.players[playerId];
  const trivia = player.activeTrivia;
  if (!trivia || trivia.outcome !== 'asking') return;

  trivia.selectedChoice = choiceIndex;
  trivia.chosenIndex = choiceIndex;
  player.triviaTotalCount += 1;

  if (choiceIndex === trivia.question.correctIndex) {
    // Correct! Resume immediately with funny ancient-style appreciation line
    player.triviaCorrectCount += 1;
    const line = getPraiseLine(state.seed, playerId, trivia.encounterIndex);
    player.praiseBanner = {
      monsterName: trivia.monster.name,
      line,
      remaining: 3.4,
    };
    player.activeTrivia = null;
    player.nextTriviaIndex += 1;
    emit?.({ type: 'trivia_correct', playerId, line });
  } else {
    // Wrong! Pause this player for 5 seconds, then resume automatically
    trivia.outcome = 'wrong_penalty';
    trivia.penaltyRemaining = state.config.wrongTriviaPenaltySeconds;
    trivia.quip = getWrongQuip(state.seed, playerId, trivia.encounterIndex);
    player.cameraShake = Math.min(1, player.cameraShake + 0.4);
    emit?.({ type: 'trivia_wrong', playerId });
  }
}

function tryExecuteJump(player: PlayerState, emit?: (e: RaceEvent) => void): void {
  if ((player.grounded || player.coyoteTimer > 0) && player.jumpBufferTimer > 0) {
    player.vy = JUMP_VELOCITY;
    player.grounded = false;
    player.coyoteTimer = 0;
    player.jumpBufferTimer = 0;
    player.squashX = 0.84;
    player.squashY = 1.2;
    emit?.({ type: 'jump', playerId: player.id });
  }
}

/**
 * Pure simulation step (clamped dt <= 0.05s).
 * Advances countdown, independent players, obstacle collisions, speed recovery, trivia triggers,
 * wrong-answer timers, win detection, and celebration auto-return.
 */
export function stepRaceState(
  state: RaceState,
  rawDt: number,
  emit?: (e: RaceEvent) => void,
  holdCelebration = false,
): void {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);

  if (state.phase === 'countdown') {
    const prevCeil = Math.ceil(state.countdownTimer);
    state.countdownTimer = Math.max(0, state.countdownTimer - dt);
    const nextCeil = Math.ceil(state.countdownTimer);
    if (nextCeil < prevCeil && nextCeil > 0) {
      emit?.({ type: 'countdown_tick', value: nextCeil });
    }
    if (state.countdownTimer <= 0) {
      state.phase = 'playing';
      emit?.({ type: 'race_go' });
    }
    return;
  }

  if (state.phase === 'gameover') {
    if (!holdCelebration) {
      state.celebrationTimer = Math.max(0, state.celebrationTimer - dt);
      if (state.celebrationTimer <= 0) {
        returnToTitle(state);
      }
    }
    return;
  }

  if (state.phase !== 'playing') return;

  state.elapsedRaceTime += dt;

  for (const player of state.players) {
    stepSinglePlayer(state, player, dt, emit);
  }

  // Check for winner (first player to cross 3,000 m display / physicalTargetMeters)
  if (state.winnerId === null) {
    const p0Fin = state.players[0].finished;
    const p1Fin = state.players[1].finished;
    if (p0Fin || p1Fin) {
      let winner: PlayerId;
      if (p0Fin && p1Fin) {
        winner =
          (state.players[0].finishTime ?? 9999) <= (state.players[1].finishTime ?? 9999)
            ? 0
            : 1;
      } else {
        winner = p0Fin ? 0 : 1;
      }
      state.winnerId = winner;
      state.phase = 'gameover';
      state.celebrationTimer = state.celebrationDuration;
      emit?.({ type: 'race_win', winnerId: winner });
    }
  }
}

function stepSinglePlayer(
  state: RaceState,
  player: PlayerState,
  dt: number,
  emit?: (e: RaceEvent) => void,
): void {
  // Visual timers always tick smoothly even during hitstop or trivia
  player.cameraShake = Math.max(0, player.cameraShake - dt * 2.4);
  player.hitFlashTimer = Math.max(0, player.hitFlashTimer - dt);
  player.hitInvulnTimer = Math.max(0, player.hitInvulnTimer - dt);

  const dampAlpha = 1 - Math.exp(-14 * dt);
  player.squashX += (1 - player.squashX) * dampAlpha;
  player.squashY += (1 - player.squashY) * dampAlpha;

  const targetLaneX = player.lane * LANE_SPACING;
  const laneAlpha = 1 - Math.exp(-22 * dt);
  player.laneX += (targetLaneX - player.laneX) * laneAlpha;

  if (player.praiseBanner) {
    player.praiseBanner.remaining -= dt;
    if (player.praiseBanner.remaining <= 0) {
      player.praiseBanner = null;
    }
  }

  // If paused at a Trivia Monster, ONLY this player pauses; opponent continues running
  if (player.activeTrivia) {
    // Gently land if mid-jump when hitting trivia trigger
    if (!player.grounded) {
      player.vy -= GRAVITY * dt;
      player.y += player.vy * dt;
      if (player.y <= 0) {
        player.y = 0;
        player.vy = 0;
        player.grounded = true;
      }
    }

    if (player.activeTrivia.outcome === 'wrong_penalty') {
      player.activeTrivia.penaltyRemaining = Math.max(
        0,
        player.activeTrivia.penaltyRemaining - dt,
      );
      if (player.activeTrivia.penaltyRemaining <= 0) {
        player.activeTrivia = null;
        player.nextTriviaIndex += 1;
        emit?.({ type: 'trivia_penalty_end', playerId: player.id });
      }
    }
    return;
  }

  // Brief hitstop freeze on heavy obstacle collision
  if (player.hitstopTimer > 0) {
    player.hitstopTimer = Math.max(0, player.hitstopTimer - dt);
    return;
  }

  // Update speed recovery: drops to 2.5 m/s on hit, recovers linearly to 5.0 m/s over 2.0s
  const { baseSpeed, penaltySpeed, recoveryDuration } = state.config;
  if (player.slowRecoveryTimer > 0) {
    player.slowRecoveryTimer = Math.max(0, player.slowRecoveryTimer - dt);
    const elapsedRecovery = recoveryDuration - player.slowRecoveryTimer;
    const t = Math.min(1, Math.max(0, elapsedRecovery / recoveryDuration));
    player.speed = penaltySpeed + (baseSpeed - penaltySpeed) * t;
  } else {
    player.speed = baseSpeed;
  }

  // Jump physics + input buffering + coyote time
  if (player.jumpBufferTimer > 0) {
    player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
  }
  if (player.grounded) {
    player.coyoteTimer = 0.09;
    tryExecuteJump(player, emit);
  } else {
    player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
    player.vy -= GRAVITY * dt;
    player.y += player.vy * dt;
    if (player.y <= 0) {
      player.y = 0;
      player.vy = 0;
      player.grounded = true;
      player.squashX = 1.22;
      player.squashY = 0.78;
      emit?.({ type: 'land', playerId: player.id });
      // Fire buffered jump immediately on landing if pressed right before touchdown
      tryExecuteJump(player, emit);
    }
  }

  // Advance forward distance
  const prevDist = player.physicalDistance;
  const nextDist = prevDist + player.speed * dt;
  player.physicalDistance = nextDist;
  player.displayDistance = Math.min(
    state.config.targetDisplayMeters,
    player.physicalDistance * state.config.displayMultiplier,
  );
  player.stridePhase += player.speed * dt * 2.1;

  // Check obstacle & broken-path chasm collisions along [prevDist, nextDist]
  if (player.hitInvulnTimer <= 0) {
    for (const obs of state.obstacles) {
      if (player.hitObstacleIds.includes(obs.id)) continue;
      const halfLen = obs.physicalLength ?? 0.8;
      if (Math.abs(player.physicalDistance - obs.physicalZ) <= halfLen) {
        const laneHit =
          obs.spansAllLanes || Math.abs(player.laneX - obs.lane * LANE_SPACING) < 1.05;
        const heightHit = !obs.jumpable || player.y < obs.height + 0.12;
        if (laneHit && heightHit) {
          applyObstacleHit(state, player, obs, emit);
          break;
        }
      }
    }
  }

  // Check trivia monster trigger point
  const triggerMeters = state.config.triviaTriggerDisplayMeters[player.nextTriviaIndex];
  if (triggerMeters !== undefined && player.displayDistance >= triggerMeters) {
    // Clamp right at the trivia plaza so the monster stands squarely in front of this player
    player.physicalDistance = triggerMeters / state.config.displayMultiplier;
    player.displayDistance = triggerMeters;
    const encounterIndex = player.nextTriviaIndex;
    const monster = MONSTERS[encounterIndex % MONSTERS.length];
    const question = getTriviaQuestionForEncounter(state.seed, player.id, encounterIndex);
    player.activeTrivia = {
      encounterIndex,
      triggerDisplayMeters: triggerMeters,
      monster,
      question,
      selectedChoice: 1, // Center choice highlighted initially
      outcome: 'asking',
      penaltyRemaining: 0,
      chosenIndex: null,
      quip: '',
    };
    emit?.({ type: 'trivia_start', playerId: player.id, monsterName: monster.name });
    return;
  }

  // Check finish line (3,000 m)
  if (player.physicalDistance >= state.config.physicalTargetMeters) {
    player.physicalDistance = state.config.physicalTargetMeters;
    player.displayDistance = state.config.targetDisplayMeters;
    player.finished = true;
    player.finishTime = state.elapsedRaceTime;
  }
}

export function applyObstacleHit(
  state: RaceState,
  player: PlayerState,
  obstacle: ObstacleDef,
  emit?: (e: RaceEvent) => void,
): void {
  player.hitObstacleIds.push(obstacle.id);
  player.obstaclesHitCount += 1;
  player.speed = state.config.penaltySpeed; // Drops immediately from 5.0 to 2.5 m/s
  player.slowRecoveryTimer = state.config.recoveryDuration; // Recovers over exactly 2.0 s
  player.hitInvulnTimer = 0.85;
  player.hitFlashTimer = 0.16;
  player.hitstopTimer = 0.045;
  player.cameraShake = 0.72;
  player.squashX = 1.28;
  player.squashY = 0.72;
  emit?.({ type: 'obstacle_hit', playerId: player.id, obstacle });
}

export function buildHudSnapshot(state: RaceState): HudSnapshot {
  const buildPlayer = (p: PlayerState) => {
    const ch = getCharacterById(p.characterId);
    return {
      id: p.id,
      characterId: p.characterId,
      characterName: `${ch.name} · ${ch.title}`,
      primaryHex: ch.primaryHex,
      physicalDistance: p.physicalDistance,
      displayDistance: Math.round(p.displayDistance),
      targetDisplayMeters: state.config.targetDisplayMeters,
      progress: Math.min(1, p.displayDistance / state.config.targetDisplayMeters),
      speed: Number(p.speed.toFixed(1)),
      baseSpeed: state.config.baseSpeed,
      isSlowed: p.slowRecoveryTimer > 0,
      slowRecoveryFraction:
        p.slowRecoveryTimer > 0
          ? 1 - p.slowRecoveryTimer / state.config.recoveryDuration
          : 1,
      activeTrivia: p.activeTrivia ? { ...p.activeTrivia } : null,
      praiseBanner: p.praiseBanner ? { ...p.praiseBanner } : null,
      obstaclesHitCount: p.obstaclesHitCount,
      triviaCorrectCount: p.triviaCorrectCount,
      triviaTotalCount: p.triviaTotalCount,
      nextTriviaIndex: p.nextTriviaIndex,
      finished: p.finished,
      finishTime: p.finishTime,
      lane: p.lane,
    };
  };

  return {
    phase: state.phase,
    mode: state.config.mode,
    countdownValue: Math.max(0, Math.ceil(state.countdownTimer)),
    elapsedRaceTime: state.elapsedRaceTime,
    celebrationTimer: state.celebrationTimer,
    celebrationDuration: state.celebrationDuration,
    winnerId: state.winnerId,
    triviaTriggers: state.config.triviaTriggerDisplayMeters,
    select: {
      cursors: [state.select.cursors[0], state.select.cursors[1]],
      locked: [state.select.locked[0], state.select.locked[1]],
      mode: state.select.mode,
    },
    players: [buildPlayer(state.players[0]), buildPlayer(state.players[1])],
  };
}

/**
 * Compares both players' physicalDistance to determine who is strictly leading
 * and the display-meter lead gap for HUD visual highlighting.
 */
export function getLeadStatus(
  p0PhysicalDistance: number,
  p1PhysicalDistance: number,
  displayMultiplier = 6,
): { leaderId: PlayerId | null; gapDisplayMeters: number } {
  const diff = p0PhysicalDistance - p1PhysicalDistance;
  if (Math.abs(diff) <= 0.05) {
    return { leaderId: null, gapDisplayMeters: 0 };
  }
  return {
    leaderId: diff > 0 ? 0 : 1,
    gapDisplayMeters: Math.max(1, Math.round(Math.abs(diff) * displayMultiplier)),
  };
}
