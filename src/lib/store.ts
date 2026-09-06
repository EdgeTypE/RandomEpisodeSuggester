import { createStore, get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { Episode, Show } from './tvmaze';

const store = createStore('res-db', 'res-store');
const EPISODE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface EpisodesCache {
  episodes: Episode[];
  updatedAt: number;
}

// In-memory fallback if IndexedDB is unavailable (private mode, etc.)
const memory = new Map<string, unknown>();

async function safeGet<T>(key: string): Promise<T | undefined> {
  try {
    const v = (await idbGet<T>(key, store)) as T | undefined;
    if (v !== undefined) return v;
  } catch {
    /* fall through to memory */
  }
  return memory.get(key) as T | undefined;
}

async function safeSet(key: string, value: unknown): Promise<void> {
  memory.set(key, value);
  try {
    await idbSet(key, value, store);
  } catch {
    /* memory fallback already set */
  }
}

async function safeDel(key: string): Promise<void> {
  memory.delete(key);
  try {
    await idbDel(key, store);
  } catch {
    /* ignore */
  }
}

const episodesKey = (showId: number) => `episodes:${showId}`;
const watchedKey = (showId: number) => `watched:${showId}`;

// localStorage mirror for small keys (recents, last show).
// Covers environments where IndexedDB is blocked but localStorage works
// (and vice versa). All access is guarded: never throws.
function lsGet<T>(key: string): T | undefined {
  try {
    if (typeof localStorage === 'undefined') return undefined;
    const raw = localStorage.getItem(`res:${key}`);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`res:${key}`, JSON.stringify(value));
  } catch {
    /* quota / private mode: ignore */
  }
}

/** Read small key: IndexedDB first, localStorage as backup (heals LS on IDB hit). */
async function readSmall<T>(key: string): Promise<T | undefined> {
  const v = await safeGet<T>(key);
  if (v !== undefined) {
    lsSet(key, v);
    return v;
  }
  return lsGet<T>(key);
}

/** Write small key to both IndexedDB and localStorage. */
async function writeSmall(key: string, value: unknown): Promise<void> {
  lsSet(key, value);
  await safeSet(key, value);
}

/** Cached episode list, or undefined when missing/stale. */
export async function getCachedEpisodes(showId: number): Promise<Episode[] | undefined> {
  const cached = await safeGet<EpisodesCache>(episodesKey(showId));
  if (!cached || Date.now() - cached.updatedAt > EPISODE_TTL_MS) return undefined;
  return cached.episodes;
}

export async function setCachedEpisodes(showId: number, episodes: Episode[]): Promise<void> {
  await safeSet(episodesKey(showId), { episodes, updatedAt: Date.now() });
}

export async function getWatchedIds(showId: number): Promise<number[]> {
  return (await safeGet<number[]>(watchedKey(showId))) ?? [];
}

export async function addWatchedId(showId: number, episodeId: number): Promise<number[]> {
  const ids = await getWatchedIds(showId);
  if (!ids.includes(episodeId)) {
    ids.push(episodeId);
    await safeSet(watchedKey(showId), ids);
  }
  return ids;
}

export async function removeWatchedId(showId: number, episodeId: number): Promise<number[]> {
  const ids = (await getWatchedIds(showId)).filter((id) => id !== episodeId);
  await safeSet(watchedKey(showId), ids);
  return ids;
}

export async function clearWatched(showId: number): Promise<void> {
  await safeDel(watchedKey(showId));
}

export async function getLastShow(): Promise<Show | undefined> {
  return readSmall<Show>('lastShow');
}

export async function setLastShow(show: Show): Promise<void> {
  await writeSmall('lastShow', show);
}

const MAX_RECENT_SHOWS = 8;
const MAX_RECENT_WATCHES = 12;

export interface RecentWatch {
  episodeId: number;
  code: string;
  episodeName: string;
  show: Show;
  at: number;
}

/** Recently viewed shows, most recent first. */
export async function getRecentShows(): Promise<Show[]> {
  return (await readSmall<Show[]>('recentShows')) ?? [];
}

export async function addRecentShow(show: Show): Promise<Show[]> {
  const list = (await getRecentShows()).filter((s) => s.id !== show.id);
  list.unshift(show);
  const trimmed = list.slice(0, MAX_RECENT_SHOWS);
  await writeSmall('recentShows', trimmed);
  return trimmed;
}

/** Recently watched episodes across all shows, most recent first. */
export async function getRecentWatches(): Promise<RecentWatch[]> {
  return (await readSmall<RecentWatch[]>('recentWatches')) ?? [];
}

export async function addRecentWatch(entry: RecentWatch): Promise<RecentWatch[]> {
  const list = (await getRecentWatches()).filter((w) => w.episodeId !== entry.episodeId);
  list.unshift(entry);
  const trimmed = list.slice(0, MAX_RECENT_WATCHES);
  await writeSmall('recentWatches', trimmed);
  return trimmed;
}

/**
 * Display list for "Recently viewed shows".
 * Invariant: any show with a recent watch must appear here, even if it fell
 * out of the viewed list (cap eviction, older history, interrupted writes).
 * Viewed order wins; watch-derived shows are appended in watch-recency order.
 */
export function mergeRecentShows(viewed: Show[], watches: RecentWatch[]): Show[] {
  const seen = new Set(viewed.map((s) => s.id));
  const extra: Show[] = [];
  for (const w of watches) {
    if (!seen.has(w.show.id)) {
      seen.add(w.show.id);
      extra.push(w.show);
    }
  }
  return [...viewed, ...extra].slice(0, MAX_RECENT_SHOWS);
}
