const API = 'https://api.tvmaze.com';

export interface Show {
  id: number;
  name: string;
  premiered?: string | null;
  ended?: string | null;
  status?: string | null;
  rating?: { average?: number | null } | null;
  image?: { medium?: string; original?: string } | null;
  summary?: string | null;
  url?: string;
}

export interface Episode {
  id: number;
  name: string;
  season: number;
  number?: number | null;
  airdate?: string | null;
  runtime?: number | null;
  rating?: { average?: number | null } | null;
  image?: { medium?: string; original?: string } | null;
  summary?: string | null;
  url?: string;
}

interface SearchEntry {
  show: Show;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res = await fetch(url, { signal });
  // TVMaze rate-limits (~20 req / 10s). Back off once and retry.
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 2500));
    res = await fetch(url, { signal });
  }
  if (!res.ok) throw new Error(`TVMaze request failed (${res.status})`);
  return (await res.json()) as T;
}

/** Fuzzy show search, re-ranked so the obvious match comes first. */
export async function searchShows(query: string, signal?: AbortSignal): Promise<Show[]> {
  const [entries, pinned] = await Promise.all([
    fetchJson<SearchEntry[]>(
      `${API}/search/shows?q=${encodeURIComponent(query)}`,
      signal
    ),
    getPinnedShows(query, signal)
  ]);
  const ranked = rankShows(
    entries.map((e) => e.show),
    query
  );
  const pinnedIds = new Set(pinned.map((p) => p.id));
  return [...pinned, ...ranked.filter((s) => !pinnedIds.has(s.id))].slice(0, 10);
}

// Famous titles with verified TVMaze IDs (taken from the /shows index).
// The fuzzy search often omits them for short queries ("sher" -> no Sherlock,
// "brook" -> no Brooklyn Nine-Nine), so they are pinned to the top on match.
const PINNED: { id: number; name: string; rating: number }[] = [
  { id: 169, name: 'Breaking Bad', rating: 9.2 },
  { id: 82, name: 'Game of Thrones', rating: 8.9 },
  { id: 179, name: 'The Wire', rating: 8.9 },
  { id: 335, name: 'Sherlock', rating: 8.9 },
  { id: 118, name: 'House', rating: 8.7 },
  { id: 216, name: 'Rick and Morty', rating: 8.7 },
  { id: 430, name: 'The X-Files', rating: 8.6 },
  { id: 618, name: 'Better Call Saul', rating: 8.6 },
  { id: 32, name: 'Fargo', rating: 8.6 },
  { id: 431, name: 'Friends', rating: 8.5 },
  { id: 526, name: 'The Office', rating: 8.5 },
  { id: 269, name: 'Peaky Blinders', rating: 8.5 },
  { id: 161, name: 'Dexter', rating: 8.4 },
  { id: 210, name: 'Doctor Who', rating: 8.3 },
  { id: 19, name: 'Supernatural', rating: 8.3 },
  { id: 112, name: 'South Park', rating: 8.3 },
  { id: 530, name: 'Seinfeld', rating: 8.3 },
  { id: 116, name: 'The Mentalist', rating: 8.2 },
  { id: 123, name: 'Lost', rating: 8.2 },
  { id: 541, name: 'Prison Break', rating: 8.2 },
  { id: 49, name: 'Brooklyn Nine-Nine', rating: 8.1 },
  { id: 83, name: 'The Simpsons', rating: 8.1 },
  { id: 5, name: 'True Detective', rating: 8.1 },
  { id: 66, name: 'The Big Bang Theory', rating: 8.0 },
  { id: 171, name: 'How I Met Your Mother', rating: 7.9 },
  { id: 73, name: 'The Walking Dead', rating: 7.9 }
];

const pinnedCache = new Map<number, Show>();

/** IDs of famous shows whose title contains the query (min 3 chars). */
export function matchPinnedIds(query: string): number[] {
  const q = norm(query);
  if (q.length < 3) return [];
  return PINNED.filter((p) => norm(p.name).includes(q))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3)
    .map((p) => p.id);
}

async function getPinnedShows(query: string, signal?: AbortSignal): Promise<Show[]> {
  const ids = matchPinnedIds(query);
  const out: Show[] = [];
  await Promise.all(
    ids.map(async (id) => {
      let s = pinnedCache.get(id);
      if (!s) {
        try {
          s = await fetchJson<Show>(`${API}/shows/${id}`, signal);
          pinnedCache.set(id, s);
        } catch (e) {
          if ((e as Error).name === 'AbortError') throw e;
          return; // fall back to ranked API results
        }
      }
      out.push(s);
    })
  );
  return out;
}

/** Lowercase, diacritics/punctuation-insensitive form for comparison. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Match tiers: exact > name starts with query > word starts with query >
// query inside name > pure fuzzy leftover (typo tolerance, last resort).
function matchTier(name: string, q: string): number {
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.split(' ').some((w) => w.startsWith(q))) return 2;
  if (name.includes(q)) return 3;
  return 4;
}

/**
 * Re-rank TVMaze results: obvious title matches first, then higher-rated
 * shows with posters. Pure fuzzy leftovers are dropped when anything matched
 * properly (they're only kept as typo-tolerance fallback).
 */
export function rankShows(shows: Show[], query: string): Show[] {
  const q = norm(query);
  if (!q) return shows.slice(0, 10);
  const scored = shows.map((s, i) => {
    const tier = matchTier(norm(s.name), q);
    const rating = s.rating?.average ?? 0;
    const hasImage = s.image?.medium || s.image?.original ? 1 : 0;
    return { s, i, tier, score: tier * 1_000_000 - rating * 1000 - hasImage * 10 };
  });
  const hasGoodMatch = scored.some((e) => e.tier <= 3);
  return scored
    .filter((e) => !hasGoodMatch || e.tier <= 3)
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .map((e) => e.s)
    .slice(0, 10);
}

/** Full episode list in airing order (specials excluded). */
export async function getEpisodes(showId: number, signal?: AbortSignal): Promise<Episode[]> {
  return fetchJson<Episode[]>(`${API}/shows/${showId}/episodes`, signal);
}

/** Strip HTML tags from TVMaze summaries. */
export function plainText(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function episodeCode(ep: Episode): string {
  const s = String(ep.season).padStart(2, '0');
  const n = ep.number == null ? '??' : String(ep.number).padStart(2, '0');
  return `S${s}E${n}`;
}
