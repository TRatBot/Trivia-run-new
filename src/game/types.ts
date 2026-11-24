export type GamePhase =
  | 'title'
  | 'select'
  | 'countdown'
  | 'playing'
  | 'paused'
  | 'gameover';

export type PlayerId = 0 | 1; // 0 = Player 1 (Left), 1 = Player 2 (Right)

export type LaneIndex = -1 | 0 | 1;

export type CharacterId =
  | 'moitrey'
  | 'anowar'
  | 'shubham'
  | 'christina'
  | 'muktar'
  | 'veravole'
  | 'inzui';

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  characterId: CharacterId;
  characterName: string;
  timeSeconds: number;
  mode: RaceMode;
  riddlesCorrect: number;
  riddlesTotal: number;
  dateIso: string;
}

export type RaceMode = 'demo' | 'full';

export type PlayerAction = 'left' | 'right' | 'jump' | 'select';

export interface PortraitCropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  title: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  primaryColor: number;
  secondaryColor: number;
  accentColor: number;
  skinColor: number;
  summary: string;
  portraitUrl: string;
  portraitCrop: PortraitCropRect;
}

export interface CustomCharacterAsset {
  kind: 'image' | 'glb';
  url: string;
  fileName: string;
}

export type ObstacleKind =
  | 'low_pillar'
  | 'tall_totem'
  | 'vine_hurdle'
  | 'broken_path_lane'
  | 'broken_path_full';

export interface ObstacleDef {
  id: string;
  physicalZ: number; // Distance along track in physical meters
  lane: LaneIndex;
  spansAllLanes: boolean; // True for full-width vine hurdle or full-width broken path chasm
  kind: ObstacleKind;
  jumpable: boolean;
  height: number;
  physicalLength?: number; // Half-extent along track for wider hazards like broken path gaps
}

export interface TriviaQuestion {
  id: string;
  category: string;
  prompt: string;
  choices: [string, string, string];
  correctIndex: 0 | 1 | 2;
}

export interface MonsterDef {
  id: string;
  name: string;
  archetype: 'jaguar' | 'owl' | 'serpent';
  primaryColor: number;
  accentColor: number;
  eyeColor: number;
}

export interface ActiveTriviaState {
  encounterIndex: number;
  triggerDisplayMeters: number;
  monster: MonsterDef;
  question: TriviaQuestion;
  selectedChoice: 0 | 1 | 2;
  outcome: 'asking' | 'wrong_penalty';
  penaltyRemaining: number; // 5.0 -> 0.0 seconds
  chosenIndex: number | null;
  quip: string;
}

export interface PraiseBanner {
  monsterName: string;
  line: string;
  remaining: number;
}

export interface PlayerState {
  id: PlayerId;
  characterId: CharacterId;
  lane: LaneIndex;
  laneX: number; // Smooth visual X position in world units
  physicalDistance: number; // Physical meters run
  displayDistance: number; // Scaled distance toward 3,000 m
  speed: number; // Current m/s (5.0 base, drops to 2.5 on obstacle hit)
  slowRecoveryTimer: number; // Remaining seconds of 2.0s recovery after obstacle hit
  hitInvulnTimer: number; // Brief invulnerability so one obstacle doesn't double-hit
  hitFlashTimer: number; // Visual hit flash duration
  hitstopTimer: number; // Per-player micro hitstop
  cameraShake: number; // Trauma 0..1
  y: number; // Vertical height above road
  vy: number; // Vertical velocity
  grounded: boolean;
  jumpBufferTimer: number; // Input buffering for responsive jumps
  coyoteTimer: number; // Brief grace window
  stridePhase: number; // Synced to physical distance
  squashX: number;
  squashY: number;
  hitObstacleIds: string[];
  nextTriviaIndex: number;
  activeTrivia: ActiveTriviaState | null;
  praiseBanner: PraiseBanner | null;
  obstaclesHitCount: number;
  triviaCorrectCount: number;
  triviaTotalCount: number;
  finished: boolean;
  finishTime: number | null;
}

export interface CharacterSelectState {
  cursors: [number, number]; // Index into CHARACTERS (0..3)
  locked: [boolean, boolean];
  mode: RaceMode;
}

export interface RaceConfig {
  mode: RaceMode;
  targetDisplayMeters: number; // Always 3000
  physicalTargetMeters: number; // 300 in demo (10x display), 3000 in full (1x display)
  displayMultiplier: number; // 10 in demo, 1 in full
  baseSpeed: number; // 5.0 m/s
  penaltySpeed: number; // 2.5 m/s
  recoveryDuration: number; // 2.0 s
  wrongTriviaPenaltySeconds: number; // 5.0 s
  triviaTriggerDisplayMeters: number[];
  worldUnitsPerPhysicalMeter: number; // Visual road pacing scale
}

export interface RaceState {
  phase: GamePhase;
  config: RaceConfig;
  seed: number;
  elapsedRaceTime: number;
  countdownTimer: number; // 3..0 before GO
  celebrationTimer: number; // Auto-return to main screen after victory
  celebrationDuration: number;
  winnerId: PlayerId | null;
  select: CharacterSelectState;
  obstacles: ObstacleDef[];
  players: [PlayerState, PlayerState];
}

export interface HudPlayerSnapshot {
  id: PlayerId;
  characterId: CharacterId;
  characterName: string;
  primaryHex: string;
  physicalDistance: number;
  displayDistance: number;
  targetDisplayMeters: number;
  progress: number;
  speed: number;
  baseSpeed: number;
  isSlowed: boolean;
  slowRecoveryFraction: number;
  activeTrivia: ActiveTriviaState | null;
  praiseBanner: PraiseBanner | null;
  obstaclesHitCount: number;
  triviaCorrectCount: number;
  triviaTotalCount: number;
  nextTriviaIndex: number;
  finished: boolean;
  finishTime: number | null;
  lane: LaneIndex;
}

export interface HudSnapshot {
  phase: GamePhase;
  mode: RaceMode;
  countdownValue: number;
  elapsedRaceTime: number;
  celebrationTimer: number;
  celebrationDuration: number;
  winnerId: PlayerId | null;
  triviaTriggers: number[];
  select: CharacterSelectState;
  players: [HudPlayerSnapshot, HudPlayerSnapshot];
}

export interface ArduinoStatus {
  supported: boolean;
  p1Connected: boolean;
  p2Connected: boolean;
  p1Label: string;
  p2Label: string;
  gamepadCount: number;
  lastEvent: string;
}
