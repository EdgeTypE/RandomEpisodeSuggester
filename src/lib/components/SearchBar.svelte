<script lang="ts">
  import { searchShows, type Show } from '../tvmaze';

  let { onSelect }: { onSelect: (show: Show) => void } = $props();

  // Rotating placeholder examples — extend freely.
  const EXAMPLE_SHOWS = ['Sherlock', 'The Mentalist', 'Brooklyn Nine Nine'];
  const placeholder = `Search shows… e.g. ${EXAMPLE_SHOWS[Math.floor(Math.random() * EXAMPLE_SHOWS.length)]}`;

  let query = $state('');
  let results: Show[] = $state([]);
  let open = $state(false);
  let searching = $state(false);
  let error = $state('');
  let activeIndex = $state(-1);
  let box: HTMLDivElement | null = $state(null);

  let debounce: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  function onInput() {
    clearTimeout(debounce);
    controller?.abort();
    error = '';
    activeIndex = -1;
    const q = query.trim();
    if (q.length < 2) {
      results = [];
      open = false;
      searching = false;
      return;
    }
    searching = true;
    debounce = setTimeout(async () => {
      controller = new AbortController();
      try {
        results = await searchShows(q, controller.signal);
        open = true;
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          error = 'Search failed. Please try again.';
          open = false;
        }
      } finally {
        searching = false;
      }
    }, 350);
  }

  function choose(show: Show) {
    query = show.name;
    results = [];
    open = false;
    activeIndex = -1;
    onSelect(show);
  }

  function onKeydown(e: KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % results.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + results.length) % results.length;
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[activeIndex >= 0 ? activeIndex : 0]);
    } else if (e.key === 'Escape') {
      open = false;
    }
  }

  function onWindowClick(e: MouseEvent) {
    if (box && !box.contains(e.target as Node)) open = false;
  }
</script>

<svelte:window onclick={onWindowClick} />

<div bind:this={box} class="relative w-full">
  <div class="relative">
    <svg
      class="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
    <input
      class="input pr-10 pl-10"
      type="search"
      placeholder={placeholder}
      aria-label="Search TV shows"
      autocomplete="off"
      bind:value={query}
      oninput={onInput}
      onkeydown={onKeydown}
      onfocus={() => results.length > 0 && (open = true)}
    />
    {#if searching}
      <svg
        class="absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    {/if}
  </div>

  {#if error}
    <p class="mt-2 text-sm text-red-400">{error}</p>
  {/if}

  {#if open && results.length > 0}
    <ul
      role="listbox"
      aria-label="Show results"
      class="card absolute z-20 mt-2 max-h-80 w-full overflow-y-auto p-1.5 shadow-xl shadow-black/50"
    >
      {#each results as show, i (show.id)}
        <li>
          <button
            type="button"
            role="option"
            aria-selected={i === activeIndex}
            data-active={i === activeIndex}
            class="result-item flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left"
            onclick={() => choose(show)}
            onmouseenter={() => (activeIndex = i)}
          >
            {#if show.image?.medium}
              <img
                src={show.image.medium}
                alt=""
                loading="lazy"
                class="h-14 w-10 shrink-0 rounded-md border border-zinc-800 object-cover"
              />
            {:else}
              <div
                class="flex h-14 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-xs text-zinc-600"
              >
                N/A
              </div>
            {/if}
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-zinc-100">{show.name}</p>
              <p class="mt-0.5 text-xs text-zinc-500">
                {show.premiered?.slice(0, 4) ?? '—'}
                {#if show.status}
                  <span class="ml-1.5">· {show.status}</span>
                {/if}
                {#if show.rating?.average}
                  <span class="ml-2 text-amber-400">★ {show.rating.average.toFixed(1)}</span>
                {/if}
              </p>
            </div>
          </button>
        </li>
      {/each}
    </ul>
  {:else if open && !searching && query.trim().length >= 2}
    <div class="card absolute z-20 mt-2 w-full p-4 text-center text-sm text-zinc-500">
      No shows found for “{query.trim()}”.
    </div>
  {/if}
</div>
