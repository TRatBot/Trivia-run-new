import { CharacterId, LeaderboardEntry, RaceMode } from './types';

export const LEADERBOARD_STORAGE_KEY = 'sunstone_sprint_leaderboard_v1';
export const MAX_LEADERBOARD_ENTRIES = 5;

export function sanitizePlayerName(raw: string): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Temple Runner';
  return cleaned.slice(0, 20);
}

export function sortAndTrimLeaderboard(
  entries: LeaderboardEntry[],
  maxEntries = MAX_LEADERBOARD_ENTRIES,
): LeaderboardEntry[] {
  return [...entries]
    .filter((e) => Number.isFinite(e.timeSeconds) && e.timeSeconds > 0)
    .sort((a, b) => a.timeSeconds - b.timeSeconds || a.dateIso.localeCompare(b.dateIso))
    .slice(0, maxEntries);
}

export function isQualifyingLeaderboardTime(
  entries: LeaderboardEntry[],
  timeSeconds: number,
  maxEntries = MAX_LEADERBOARD_ENTRIES,
): boolean {
  if (!Number.isFinite(timeSeconds) || timeSeconds <= 0) return false;
  const sorted = sortAndTrimLeaderboard(entries, maxEntries);
  if (sorted.length < maxEntries) return true;
  return timeSeconds < sorted[sorted.length - 1].timeSeconds;
}

export function addLeaderboardEntry(
  entries: LeaderboardEntry[],
  input: {
    id?: string;
    playerName: string;
    characterId: CharacterId;
    characterName: string;
    timeSeconds: number;
    mode: RaceMode;
    riddlesCorrect: number;
    riddlesTotal: number;
    dateIso?: string;
  },
  maxEntries = MAX_LEADERBOARD_ENTRIES,
): { entries: LeaderboardEntry[]; entry: LeaderboardEntry; rank: number | null } {
  const entry: LeaderboardEntry = {
    id: input.id ?? `lb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    playerName: sanitizePlayerName(input.playerName),
    characterId: input.characterId,
    characterName: input.characterName,
    timeSeconds: Number(input.timeSeconds.toFixed(2)),
    mode: input.mode,
    riddlesCorrect: input.riddlesCorrect,
    riddlesTotal: input.riddlesTotal,
    dateIso: input.dateIso ?? new Date().toISOString(),
  };

  const next = sortAndTrimLeaderboard([...entries, entry], maxEntries);
  const idx = next.findIndex((item) => item.id === entry.id);
  return {
    entries: next,
    entry,
    rank: idx >= 0 ? idx + 1 : null,
  };
}

export function formatRaceTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const rem = safe - mins * 60;
  if (mins > 0) {
    return `${mins}:${rem.toFixed(2).padStart(5, '0')}`;
  }
  return `${rem.toFixed(2)}s`;
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortAndTrimLeaderboard(parsed as LeaderboardEntry[]);
  } catch {
    return [];
  }
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(
      LEADERBOARD_STORAGE_KEY,
      JSON.stringify(sortAndTrimLeaderboard(entries)),
    );
  } catch {
    // Ignore storage quota / private-browsing errors cleanly
  }
}

export function clearLeaderboard(): LeaderboardEntry[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LEADERBOARD_STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
  return [];
}
