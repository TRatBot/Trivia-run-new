import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS } from './data';
import {
  addLeaderboardEntry,
  formatRaceTime,
  isQualifyingLeaderboardTime,
  sanitizePlayerName,
} from './leaderboard';
import {
  beginRaceCountdown,
  createInitialRaceState,
  createRaceConfig,
  enterCharacterSelect,
  generateObstacles,
  getLeadStatus,
  getTriviaQuestionForEncounter,
  handleCharacterSelectAction,
  handlePlayerRaceAction,
  selectCharacterByIndex,
  startRaceIfReady,
  stepRaceState,
  submitTriviaAnswer,
} from './raceLogic';

test('character selection supports all 7 teachers, funny descriptions, live preview, and strict uniqueness', () => {
  assert.equal(CHARACTERS.length, 7);
  for (const ch of CHARACTERS) {
    assert.ok(ch.summary.length > 25, `${ch.name} should have a funny description`);
  }
  const state = createInitialRaceState('demo', 1001);
  enterCharacterSelect(state);

  // Clicking a card previews immediately without locking or starting the race
  assert.equal(selectCharacterByIndex(state, 0, 2, false), true); // Sir Shubham
  assert.equal(state.select.locked[0], false);
  assert.equal(state.players[0].characterId, 'shubham');
  assert.equal(state.phase, 'select');

  // Pressing jump during select triggers a live pedestal preview jump event
  let previewFired = false;
  handleCharacterSelectAction(state, 0, 'jump', (ev) => {
    if (ev.type === 'select_preview' && ev.playerId === 0) previewFired = true;
  });
  assert.equal(previewFired, true);

  // Player 1 locks character 2 (Sir Shubham)
  assert.equal(selectCharacterByIndex(state, 0, 2, true), true);
  assert.equal(state.select.locked[0], true);
  assert.equal(state.select.cursors[0], 2);

  // Player 2 cannot pick or lock character 2 (Sir Shubham)
  let blockedFired = false;
  const ok = selectCharacterByIndex(state, 1, 2, true, (ev) => {
    if (ev.type === 'select_blocked' && ev.playerId === 1) blockedFired = true;
  });
  assert.equal(ok, false);
  assert.equal(blockedFired, true);
  assert.equal(state.select.locked[1], false);

  // Player 2 previews & locks character 3 (Miss Christina) -> stays in select so both can preview matchup!
  assert.equal(selectCharacterByIndex(state, 1, 3, true), true);
  assert.equal(state.select.locked[1], true);
  assert.equal(state.phase, 'select');
  assert.notEqual(state.players[0].characterId, state.players[1].characterId);

  // Explicitly starting the race once both are ready begins the countdown
  assert.equal(startRaceIfReady(state), true);
  assert.equal(state.phase, 'countdown');
});

test('character selection cursor automatically skips opponent locked character', () => {
  const state = createInitialRaceState('demo', 1002);
  enterCharacterSelect(state);
  selectCharacterByIndex(state, 0, 1, true); // P1 locks index 1

  state.select.cursors[1] = 0;
  handleCharacterSelectAction(state, 1, 'right');
  // Should skip index 1 and land on index 2
  assert.equal(state.select.cursors[1], 2);
});

test('obstacle hit drops speed from 9.0 m/s to 4.0 m/s and recovers linearly over 2.0s', () => {
  const state = createInitialRaceState('demo', 2001);
  enterCharacterSelect(state);
  beginRaceCountdown(state, undefined, true);

  // Place a deterministic obstacle right ahead of Player 1 in lane 0
  state.obstacles = [
    {
      id: 'test_obs_1',
      physicalZ: 10.0,
      lane: 0,
      spansAllLanes: false,
      kind: 'tall_totem',
      jumpable: false,
      height: 2.3,
    },
  ];
  state.players[0].physicalDistance = 9.8;
  state.players[0].lane = 0;
  state.players[0].laneX = 0;

  let hitEventFired = false;
  stepRaceState(state, 0.05, (ev) => {
    if (ev.type === 'obstacle_hit' && ev.playerId === 0) hitEventFired = true;
  });

  assert.equal(hitEventFired, true);
  assert.equal(state.players[0].speed, 4.0);
  assert.equal(state.players[0].slowRecoveryTimer, 2.0);
  // Player 2 is unaffected
  assert.equal(state.players[1].speed, 9.0);

  // Clear hitstop (0.045s) first
  stepRaceState(state, 0.05);

  // Advance 1.0 second of recovery (20 steps of 0.05s) -> speed should be ~6.5 m/s
  for (let i = 0; i < 20; i++) {
    stepRaceState(state, 0.05);
  }
  assert.ok(
    Math.abs(state.players[0].speed - 6.5) < 0.08,
    `Expected speed ~6.5 m/s at 1.0s, got ${state.players[0].speed}`,
  );

  // Advance another 1.0 second -> speed must be back to 9.0 m/s
  for (let i = 0; i < 20; i++) {
    stepRaceState(state, 0.05);
  }
  assert.equal(state.players[0].speed, 9.0);
  assert.equal(state.players[0].slowRecoveryTimer, 0);
});

test('jumping clears broken path chasms and low hurdles without speed penalty', () => {
  const state = createInitialRaceState('demo', 2002);
  enterCharacterSelect(state);
  beginRaceCountdown(state, undefined, true);

  state.obstacles = [
    {
      id: 'broken_gap_1',
      physicalZ: 12.0,
      lane: 0,
      spansAllLanes: true,
      kind: 'broken_path_full',
      jumpable: true,
      height: 0.35,
      physicalLength: 1.5,
    },
  ];
  state.players[0].physicalDistance = 9.8;
  handlePlayerRaceAction(state, 0, 'jump');

  // Step through crossing physicalZ = 12.0 while airborne
  for (let i = 0; i < 12; i++) {
    stepRaceState(state, 0.05);
  }
  assert.equal(state.players[0].obstaclesHitCount, 0);
  assert.equal(state.players[0].speed, 9.0);

  // Running straight into a broken path WITHOUT jumping triggers a stumble hit
  state.players[1].physicalDistance = 11.2;
  stepRaceState(state, 0.05);
  assert.equal(state.players[1].obstaclesHitCount, 1);
  assert.equal(state.players[1].speed, 4.0);
});

test('both modes have exactly 10 riddles per player with 20 distinct riddles across P1 and P2', () => {
  const demoConfig = createRaceConfig('demo');
  const fullConfig = createRaceConfig('full');
  assert.equal(demoConfig.triviaTriggerDisplayMeters.length, 10);
  assert.equal(fullConfig.triviaTriggerDisplayMeters.length, 10);

  const p1Ids = new Set<string>();
  const p2Ids = new Set<string>();
  for (let i = 0; i < 10; i++) {
    p1Ids.add(getTriviaQuestionForEncounter(4201, 0, i).id);
    p2Ids.add(getTriviaQuestionForEncounter(4201, 1, i).id);
  }
  assert.equal(p1Ids.size, 10, 'P1 must receive 10 distinct riddles');
  assert.equal(p2Ids.size, 10, 'P2 must receive 10 distinct riddles');
  for (const id of p1Ids) {
    assert.equal(p2Ids.has(id), false, `Riddle ${id} should not overlap between P1 and P2`);
  }
});

test('riddle encounter pauses only the triggered player while opponent keeps running', () => {
  const state = createInitialRaceState('demo', 3001);
  enterCharacterSelect(state);
  beginRaceCountdown(state, undefined, true);
  state.obstacles = [];

  // First riddle trigger is at 270 display meters -> 45 physical meters in demo mode (6x)
  state.players[0].physicalDistance = 44.8;
  state.players[0].displayDistance = 268.8;
  state.players[1].physicalDistance = 20.0;
  state.players[1].displayDistance = 120;

  stepRaceState(state, 0.05);

  assert.ok(state.players[0].activeTrivia !== null, 'P1 should enter riddle');
  assert.equal(state.players[1].activeTrivia, null, 'P2 should not enter riddle');

  const p0DistLocked = state.players[0].physicalDistance;
  const p1DistBefore = state.players[1].physicalDistance;

  // Step 1 second -> P1 stays paused, P2 keeps running at 9 m/s
  for (let i = 0; i < 20; i++) {
    stepRaceState(state, 0.05);
  }
  assert.equal(state.players[0].physicalDistance, p0DistLocked);
  assert.ok(state.players[1].physicalDistance > p1DistBefore + 8.5);

  // P1 answers correctly -> resumes immediately with ancient praise line
  const correctIdx = state.players[0].activeTrivia!.question.correctIndex;
  submitTriviaAnswer(state, 0, correctIdx);
  assert.equal(state.players[0].activeTrivia, null);
  assert.ok(state.players[0].praiseBanner !== null);
  assert.ok(state.players[0].praiseBanner!.line.length > 10);

  stepRaceState(state, 0.05);
  assert.ok(state.players[0].physicalDistance > p0DistLocked);
});

test('wrong riddle answer pauses that player for 5 seconds then resumes automatically', () => {
  const state = createInitialRaceState('demo', 3002);
  enterCharacterSelect(state);
  beginRaceCountdown(state, undefined, true);
  state.obstacles = [];

  state.players[0].physicalDistance = 44.85;
  stepRaceState(state, 0.05);
  assert.ok(state.players[0].activeTrivia !== null);

  const wrongIdx = (((state.players[0].activeTrivia!.question.correctIndex + 1) % 3) as
    | 0
    | 1
    | 2);
  submitTriviaAnswer(state, 0, wrongIdx);

  assert.equal(state.players[0].activeTrivia!.outcome, 'wrong_penalty');
  assert.equal(state.players[0].activeTrivia!.penaltyRemaining, 5.0);

  // Advance 4.0 seconds -> still paused
  for (let i = 0; i < 80; i++) {
    stepRaceState(state, 0.05);
  }
  assert.ok(state.players[0].activeTrivia !== null);
  assert.ok(state.players[0].activeTrivia!.penaltyRemaining > 0.8);

  // Advance 1.1 seconds -> penalty finishes and player resumes
  for (let i = 0; i < 22; i++) {
    stepRaceState(state, 0.05);
  }
  assert.equal(state.players[0].activeTrivia, null);
});

test('reaching 3000m finishes the race, crowns the winner, and auto-returns to title after celebration', () => {
  const state = createInitialRaceState('demo', 4001);
  enterCharacterSelect(state);
  beginRaceCountdown(state, undefined, true);
  state.obstacles = [];
  // Skip past all 10 riddles for finish test
  state.players[1].nextTriviaIndex = state.config.triviaTriggerDisplayMeters.length;
  state.players[1].physicalDistance = 499.8;

  stepRaceState(state, 0.05);
  assert.equal(state.phase, 'gameover');
  assert.equal(state.winnerId, 1);

  // Celebration countdown auto-returns to title screen
  for (let i = 0; i < 165; i++) {
    stepRaceState(state, 0.05);
  }
  assert.equal(state.phase, 'title');
});

test('generated high-density obstacle course includes broken paths and respects safe zones', () => {
  const config = createRaceConfig('demo');
  const obstacles = generateObstacles(config, 9999);
  assert.ok(obstacles.length >= 35, `Expected dense obstacles (>=35), got ${obstacles.length}`);
  assert.ok(
    obstacles.some((o) => o.kind === 'broken_path_lane' || o.kind === 'broken_path_full'),
    'Course must include broken path chasm hazards',
  );

  // Safe start zone (first 18m clear)
  assert.equal(
    obstacles.some((o) => o.physicalZ < 18),
    false,
    'No obstacles in opening safe runway',
  );

  // No obstacles overlapping riddle plazas (+/- 7.0m)
  const triviaPhysicals = config.triviaTriggerDisplayMeters.map(
    (d) => d / config.displayMultiplier,
  );
  for (const tz of triviaPhysicals) {
    assert.equal(
      obstacles.some((o) => Math.abs(o.physicalZ - tz) < 7.0),
      false,
      `No obstacles near riddle plaza at ${tz}m`,
    );
  }
});

test('getLeadStatus compares physicalDistance accurately for P1 lead, P2 lead, and ties', () => {
  const tied = getLeadStatus(40.0, 40.02, 6);
  assert.equal(tied.leaderId, null);
  assert.equal(tied.gapDisplayMeters, 0);

  const p1Lead = getLeadStatus(52.5, 42.5, 6);
  assert.equal(p1Lead.leaderId, 0);
  assert.equal(p1Lead.gapDisplayMeters, 60);

  const p2Lead = getLeadStatus(120, 145, 1);
  assert.equal(p2Lead.leaderId, 1);
  assert.equal(p2Lead.gapDisplayMeters, 25);
});

test('leaderboard sorts fastest first, trims to top 5, checks qualification, and sanitizes names', () => {
  assert.equal(sanitizePlayerName('   '), 'Temple Runner');
  assert.equal(sanitizePlayerName('  Alex   Smith  '), 'Alex Smith');
  assert.equal(formatRaceTime(58.42), '58.42s');
  assert.equal(formatRaceTime(72.5), '1:12.50');

  let board = [] as ReturnType<typeof addLeaderboardEntry>['entries'];
  const times = [82.4, 65.1, 74.9, 59.3, 91.2, 68.7];
  times.forEach((t, i) => {
    const res = addLeaderboardEntry(board, {
      id: `run_${i}`,
      playerName: `Runner ${i + 1}`,
      characterId: 'shubham',
      characterName: 'Sir Shubham',
      timeSeconds: t,
      mode: 'demo',
      riddlesCorrect: 9,
      riddlesTotal: 10,
      dateIso: `2026-11-23T10:0${i}:00.000Z`,
    });
    board = res.entries;
  });

  assert.equal(board.length, 5);
  assert.deepEqual(
    board.map((e) => e.timeSeconds),
    [59.3, 65.1, 68.7, 74.9, 82.4],
  );
  assert.equal(isQualifyingLeaderboardTime(board, 80.0), true);
  assert.equal(isQualifyingLeaderboardTime(board, 85.0), false);
});

