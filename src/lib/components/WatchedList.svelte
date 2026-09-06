<script lang="ts">
  import { episodeCode, type Episode } from '../tvmaze';

  let {
    episodes,
    onRemove,
    onClear
  }: {
    episodes: Episode[];
    onRemove: (id: number) => void;
    onClear: () => void;
  } = $props();
</script>

<section aria-label="Watched episodes" class="mt-8">
  <div class="mb-3 flex items-center justify-between">
    <h2 class="text-sm font-semibold tracking-wide text-zinc-400 uppercase">
      Watched · {episodes.length}
    </h2>
    {#if episodes.length > 0}
      <button
        type="button"
        onclick={onClear}
        class="cursor-pointer text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
      >
        Clear all
      </button>
    {/if}
  </div>

  {#if episodes.length === 0}
    <p class="text-sm text-zinc-600">Nothing marked as watched yet. They will appear here.</p>
  {:else}
    <ul class="grid gap-2 sm:grid-cols-2">
      {#each episodes as ep (ep.id)}
        <li
          class="card flex items-center gap-3 px-3 py-2.5"
        >
          <span class="badge shrink-0">{episodeCode(ep)}</span>
          <span class="min-w-0 flex-1 truncate text-sm text-zinc-300">{ep.name}</span>
          <button
            type="button"
            onclick={() => onRemove(ep.id)}
            aria-label={`Unmark ${ep.name} as watched`}
            title="Unmark as watched"
            class="shrink-0 cursor-pointer rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
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
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>
