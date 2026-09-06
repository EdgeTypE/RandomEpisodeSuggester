<script lang="ts">
  import { episodeCode, plainText, type Episode, type Show } from '../tvmaze';

  let {
    show,
    episode,
    remaining,
    canReroll,
    onReroll,
    onWatched
  }: {
    show: Show;
    episode: Episode;
    remaining: number;
    canReroll: boolean;
    onReroll: () => void;
    onWatched: () => void;
  } = $props();
</script>

<article class="card overflow-hidden">
  <div class="flex flex-col sm:flex-row">
    {#if episode.image?.medium}
      <img
        src={episode.image.medium}
        alt=""
        class="h-44 w-full object-cover sm:h-auto sm:w-64 sm:shrink-0"
      />
    {/if}
    <div class="min-w-0 flex-1 p-5">
      <div class="flex flex-wrap items-center gap-2">
        <span class="badge">{episodeCode(episode)}</span>
        {#if episode.rating?.average}
          <span class="badge">★ {episode.rating.average.toFixed(1)}</span>
        {/if}
        {#if episode.runtime}
          <span class="badge">{episode.runtime} min</span>
        {/if}
      </div>

      <h2 class="mt-3 text-xl font-semibold tracking-tight text-zinc-50">
        {episode.name}
      </h2>
      <p class="mt-1 text-sm text-zinc-500">
        {show.name}
        {#if episode.airdate}
          · {episode.airdate}
        {/if}
      </p>

      {#if plainText(episode.summary)}
        <p class="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-400">
          {plainText(episode.summary)}
        </p>
      {/if}

      <div class="mt-5 flex flex-wrap gap-2">
        <button type="button" class="btn btn-primary" onclick={onReroll} disabled={!canReroll}>
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
          Reroll
        </button>
        <button type="button" class="btn btn-secondary" onclick={onWatched}>
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Mark as watched
        </button>
        {#if episode.url}
          <a
            href={episode.url}
            target="_blank"
            rel="noreferrer"
            class="btn btn-secondary"
          >
            Details
          </a>
        {/if}
      </div>

      <p class="mt-3 text-xs text-zinc-600">
        {remaining} episode{remaining === 1 ? '' : 's'} left unwatched
      </p>
    </div>
  </div>
</article>
