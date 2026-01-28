<script lang="ts">
  import BaseLayout from '$lib/components/BaseLayout.svelte';
  import Icon from '../components/Icon.svelte';

  import { config } from '$lib/stores/config';
  import { storage } from '$lib/stores/storage';

  import { link, replace } from 'svelte-spa-router';
  import { tick } from 'svelte';

  import type { CollectionConfig } from '$lib/stores/config';

  /* ─────────────────────────────────────────────
   * ROUTE PROPS (Svelte 5)
   * ───────────────────────────────────────────── */
  let { params = { collection: '' } } = $props();

  /* ─────────────────────────────────────────────
   * DERIVED ROUTE PARAM
   * ───────────────────────────────────────────── */
  const collectionParam = $derived(params.collection ?? '');

  /* ─────────────────────────────────────────────
   * COLLECTION CONFIG
   * ───────────────────────────────────────────── */
  const collection = $derived<CollectionConfig | undefined>(
    $config?.collections?.find(c => (c.slug || c.name) === collectionParam)
  );

  const tableColumns = $derived(
    collection?.columns ?? [
      {
        name: collection?.identifier_field || 'title',
        label: 'Entry'
      }
    ]
  );

  /* ─────────────────────────────────────────────
   * STATE
   * ───────────────────────────────────────────── */
  let entries: any[] = $state([]);
  let loading = $state(false);

  let sortKey = $state<string>('date');
  let sortDirection = $state<'asc' | 'desc'>('desc');

  /* ─────────────────────────────────────────────
   * EFFECTS
   * ───────────────────────────────────────────── */
  $effect(() => {
    if ($config && collectionParam && !collection) {
      replace('/404');
      return;
    }
  });

  $effect(() => {
    if (!collection) return;

    sortKey = collection.sort?.key || 'date';
    sortDirection = collection.sort?.direction || 'desc';
  });

  $effect(() => {
    if (!collection || !$storage) return;
    loadEntries();
  });

  /* ─────────────────────────────────────────────
   * DATA LOADING
   * ───────────────────────────────────────────── */
  async function loadEntries() {
    if (!collection || !$storage) {
      entries = [];
      return;
    }

    loading = true;
    await tick();

    try {
      const result = await $storage.listEntries(
        collection.path,
        collection.extension,
        collection.format
      );
      entries = Array.isArray(result) ? result : [];
    } catch (err) {
      console.error('Failed to load entries', err);
      entries = [];
    } finally {
      loading = false;
    }
  }

  /* ─────────────────────────────────────────────
   * SORTING
   * ───────────────────────────────────────────── */
  function handleSort(key: string) {
    if (sortKey === key) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDirection =
        key === 'date' || key.toLowerCase().includes('at')
          ? 'desc'
          : 'asc';
    }
  }

  const sortedEntries = $derived(
    [...entries].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (sortKey === 'date' || sortKey.toLowerCase().includes('at')) {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      const mod = sortDirection === 'asc' ? 1 : -1;
      return aVal < bVal ? -1 * mod : 1 * mod;
    })
  );

  /* ─────────────────────────────────────────────
   * HELPERS
   * ───────────────────────────────────────────── */
  function formatValue(value: any): string {
    if (value == null) return '—';

    if (
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}/.test(value)
    ) {
      return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }

    if (Array.isArray(value)) return `${value.length} items`;
    if (typeof value === 'string' && value.length > 60)
      return value.slice(0, 60) + '…';

    return String(value);
  }

  const themeMap = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    rose: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
    amber: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    neutral: 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900',
    ghost: 'bg-transparent text-neutral-400 border-neutral-200 dark:border-neutral-800'
  };

  type ThemeColor = keyof typeof themeMap;
</script>

<BaseLayout>
  <div>
    <!-- HEADER -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-3xl font-extrabold text-neutral-900 dark:text-white">
          {collection?.label || collection?.name}
        </h1>

        {#if entries.length > 0}
          <p class="text-neutral-500 dark:text-neutral-400 mt-1 text-sm">
            Managing {entries.length}
            {entries.length === 1 ? ' entry' : ' entries'} in
            <code class="px-1 text-xs rounded bg-neutral-100 dark:bg-neutral-800">
              {collection?.path}
            </code>
          </p>
        {/if}
      </div>

      <a
        href="/collection/{collectionParam}/new" use:link class="px-5 py-2.5 rounded-xl font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow">
        <Icon name="plus" class="w-4 h-4 inline mr-2" />
        Create New
      </a>
    </div>

    <!-- STATES -->
    {#if loading}
      <div class="p-24 text-center">
        <Icon name="loading" class="w-10 h-10 animate-spin mx-auto" />
      </div>

    {:else if sortedEntries.length === 0}
      <div class="text-center py-20 border-2 border-dashed rounded-xl">
        <Icon name="folderEmpty" class="w-12 h-12 mx-auto opacity-30" />
        <p class="mt-4 text-neutral-500">
          No entries found —
          <a href="/collection/{collectionParam}/new" use:link class="underline">
            add one
          </a>
        </p>
      </div>

    {:else}
      <!-- TABLE -->
      <div class="overflow-x-auto rounded-xl border">
        <table class="w-full text-sm">
          <thead class="bg-neutral-50 dark:bg-neutral-800/50">
            <tr>
              {#each tableColumns as col}
                <th class="px-6 py-4">
                  <button
                    onclick={() => handleSort(col.name)}
                    class="flex items-center gap-2 font-semibold"
                  >
                    {col.label}
                    <Icon
                      name={
                        sortKey === col.name
                          ? sortDirection === 'asc'
                            ? 'arrowUp'
                            : 'arrowDown'
                          : 'selector'
                      }
                      class="w-3 h-3"
                    />
                  </button>
                </th>
              {/each}
              <th></th>
            </tr>
          </thead>

          <tbody class="divide-y">
            {#each sortedEntries as entry (entry.id)}
              <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                {#each tableColumns as col}
                  <td class="px-6 py-4">
                    {#if col.name === (collection?.identifier_field || 'title')}
                      <a href="/collection/{collectionParam}/edit/{entry.id}" use:link class="font-bold hover:underline">
                        {formatValue(entry[col.name])}
                      </a>
                    {:else}
                      {formatValue(entry[col.name])}
                    {/if}
                  </td>
                {/each}

                <td class="px-6 py-4 text-right">
                  <a href="/collection/{collectionParam}/edit/{entry.id}" use:link class="text-xs font-bold underline">
                    Edit
                  </a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</BaseLayout>
