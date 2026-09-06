<script lang="ts">
  import { onMount } from 'svelte';
  import SearchBar from './lib/components/SearchBar.svelte';
  import EpisodeCard from './lib/components/EpisodeCard.svelte';
  import WatchedList from './lib/components/WatchedList.svelte';
  import RecentActivity from './lib/components/RecentActivity.svelte';
  import { episodeCode, getEpisodes, type Episode, type Show } from './lib/tvmaze';
  import {
    addRecentShow,
    addRecentWatch,
    addWatchedId,
    clearWatched,
    getCachedEpisodes,
    getLastShow,
    getRecentShows,
    getRecentWatches,
    getWatchedIds,
    removeWatchedId,
    mergeRecentShows,
    setCachedEpisodes,
    setLastShow,
    type RecentWatch
  } from './lib/store';

  let show: Show | null = $state(null);
  let episodes: Episode[] = $state([]);
  let suggestion: Episode | null = $state(null);
  let watchedIds: number[] = $state([]);
  let recentShows: Show[] = $state([]);
  let recentWatches: RecentWatch[] = $state([]);
  let loading = $state(false);
  let restoring = $state(true);
  let loadError = $state('');

  const unwatched = $derived(episodes.filter((e) => !watchedIds.includes(e.id)));
  const watchedEpisodes = $derived(episodes.filter((e) => watchedIds.includes(e.id)));
  // Any show with a recent watch is always listed, even if it fell out of
  // the viewed list (cap eviction, older history, interrupted writes).
  const recentShowsView = $derived(mergeRecentShows(recentShows, recentWatches));

  function randomPick(pool: Episode[], excludeId?: number): Episode | null {
    let list = pool;
    if (list.length > 1 && excludeId != null) list = list.filter((e) => e.id !== excludeId);
    if (list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  async function selectShow(s: Show) {
    show = s;
    episodes = [];
    suggestion = null;
    loadError = '';
    loading = true;
    watchedIds = await getWatchedIds(s.id);
    await setLastShow(s);
    recentShows = await addRecentShow(s);

    // Instant paint from IndexedDB cache, then revalidate in background.
    const cached = await getCachedEpisodes(s.id);
    if (cached && cached.length > 0) {
      episodes = cached;
      suggestion = randomPick(cached.filter((e) => !watchedIds.includes(e.id)));
      loading = false;
    }
    try {
      const fresh = await getEpisodes(s.id);
      episodes = fresh;
      await setCachedEpisodes(s.id, fresh);
      const pool = fresh.filter((e) => !watchedIds.includes(e.id));
      if (!suggestion || !fresh.some((e) => e.id === (suggestion as Episode).id)) {
        suggestion = randomPick(pool);
      }
    } catch {
      if (episodes.length === 0) loadError = 'Could not load episodes. Please try again.';
    } finally {
      loading = false;
    }
  }

  function reroll() {
    suggestion = randomPick(unwatched, suggestion?.id);
  }

  async function markWatched() {
    if (!show || !suggestion) return;
    const ep = suggestion;
    const justWatched = ep.id;
    watchedIds = await addWatchedId(show.id, justWatched);
    recentWatches = await addRecentWatch({
      episodeId: ep.id,
      code: episodeCode(ep),
      episodeName: ep.name,
      show,
      at: Date.now()
    });
    // Watching is activity too: keep the show at the top of recents.
    recentShows = await addRecentShow(show);
    suggestion = randomPick(
      episodes.filter((e) => !watchedIds.includes(e.id)),
      justWatched
    );
  }

  async function unmarkWatched(id: number) {
    if (!show) return;
    watchedIds = await removeWatchedId(show.id, id);
    if (!suggestion && unwatched.length > 0) suggestion = randomPick(unwatched);
  }

  async function resetWatched() {
    if (!show) return;
    await clearWatched(show.id);
    watchedIds = [];
    suggestion = randomPick(episodes);
  }

  onMount(async () => {
    try {
      recentShows = await getRecentShows();
      recentWatches = await getRecentWatches();
      const last = await getLastShow();
      if (last) await selectShow(last);
    } finally {
      restoring = false;
    }
  });
</script>

<div class="mx-auto min-h-screen w-full max-w-2xl px-4 pt-12 pb-16 sm:pt-16">
  <header class="text-center">
    <h1 class="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
      Random Episode Suggester
    </h1>
    <p class="mt-2 text-sm text-zinc-400 sm:text-base">
      Search a show, get a random episode. Never get one you've already watched.
    </p>
  </header>

  <main class="mt-8">
    <SearchBar onSelect={selectShow} />

    <div class="mt-6">
      {#if restoring || (loading && episodes.length === 0)}
        <div class="card animate-pulse p-5" aria-label="Loading">
          <div class="h-5 w-24 rounded bg-zinc-800"></div>
          <div class="mt-3 h-7 w-2/3 rounded bg-zinc-800"></div>
          <div class="mt-2 h-4 w-1/3 rounded bg-zinc-800"></div>
          <div class="mt-5 flex gap-2">
            <div class="h-10 w-28 rounded-lg bg-zinc-800"></div>
            <div class="h-10 w-40 rounded-lg bg-zinc-800"></div>
          </div>
        </div>
      {:else if loadError}
        <div class="card border-red-900 p-5 text-center">
          <p class="text-sm text-red-400">{loadError}</p>
          {#if show}
            <button type="button" class="btn btn-secondary mt-4" onclick={() => selectShow(show as Show)}>
              Retry
            </button>
          {/if}
        </div>
      {:else if show && suggestion}
        <EpisodeCard
          {show}
          episode={suggestion}
          remaining={unwatched.length}
          canReroll={unwatched.length > 1}
          onReroll={reroll}
          onWatched={markWatched}
        />
      {:else if show && episodes.length > 0 && unwatched.length === 0}
        <div class="card p-8 text-center">
          <p class="text-5xl" aria-hidden="true">🎬</p>
          <h2 class="mt-3 text-lg font-semibold text-zinc-100">You've watched them all!</h2>
          <p class="mt-1 text-sm text-zinc-500">
            Every episode of {show.name} is marked as watched.
          </p>
          <button type="button" class="btn btn-secondary mt-5" onclick={resetWatched}>
            Reset watched list
          </button>
        </div>
      {:else if !show}
        <div class="card border-dashed p-8 text-center">
          <p class="text-sm text-zinc-500">
            Search for a show above to get your first random episode suggestion.
          </p>
        </div>
      {/if}
    </div>

    {#if show}
      <WatchedList
        episodes={watchedEpisodes}
        onRemove={unmarkWatched}
        onClear={resetWatched}
      />
    {/if}

    <RecentActivity shows={recentShowsView} watches={recentWatches} onSelectShow={selectShow} />
  </main>

  <footer class="mt-12 text-center text-xs text-zinc-600">
    Data by <a href="https://www.tvmaze.com/api" target="_blank" rel="noreferrer" class="underline underline-offset-4 hover:text-zinc-400">TVMaze API</a>
    · CC BY-SA
  </footer>
</div>
