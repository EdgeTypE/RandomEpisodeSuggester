<script lang="ts">
  import type { RecentWatch } from '../store';
  import type { Show } from '../tvmaze';

  let {
    shows,
    watches,
    onSelectShow
  }: {
    shows: Show[];
    watches: RecentWatch[];
    onSelectShow: (show: Show) => void;
  } = $props();
</script>

{#if shows.length > 0 || watches.length > 0}
  <div class="mt-10 space-y-8">
    {#if shows.length > 0}
      <section aria-label="Recently viewed shows">
        <h2 class="mb-3 text-sm font-semibold tracking-wide text-zinc-400 uppercase">
          Recently viewed shows
        </h2>
        <div class="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {#each shows as s (s.id)}
            <button
              type="button"
              onclick={() => onSelectShow(s)}
              title={s.name}
              class="group cursor-pointer overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition hover:border-zinc-600"
            >
              {#if s.image?.medium}
                <img
                  src={s.image.medium}
                  alt={s.name}
                  loading="lazy"
                  class="aspect-[2/3] w-full object-cover"
                />
              {:else}
                <div class="flex aspect-[2/3] w-full items-center justify-center p-1 text-center text-[11px] text-zinc-500">
                  {s.name}
                </div>
              {/if}
              <p class="truncate px-1.5 py-1 text-[11px] text-zinc-400 group-hover:text-zinc-200">
                {s.name}
              </p>
            </button>
          {/each}
        </div>
      </section>
    {/if}

    {#if watches.length > 0}
      <section aria-label="Recently watched episodes">
        <h2 class="mb-3 text-sm font-semibold tracking-wide text-zinc-400 uppercase">
          Recently watched episodes
        </h2>
        <ul class="grid gap-2 sm:grid-cols-2">
          {#each watches as w (w.episodeId)}
            <li>
              <button
                type="button"
                onclick={() => onSelectShow(w.show)}
                title={`Back to ${w.show.name}`}
                class="card flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition hover:border-zinc-600"
              >
                {#if w.show.image?.medium}
                  <img
                    src={w.show.image.medium}
                    alt=""
                    loading="lazy"
                    class="h-10 w-7 shrink-0 rounded border border-zinc-800 object-cover"
                  />
                {/if}
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm text-zinc-200">
                    <span class="mr-2 font-mono text-xs text-zinc-500">{w.code}</span>{w.episodeName}
                  </p>
                  <p class="truncate text-xs text-zinc-500">{w.show.name}</p>
                </div>
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
{/if}
