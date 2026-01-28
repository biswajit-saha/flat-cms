<script lang="ts">
  import BaseLayout from '$lib/components/BaseLayout.svelte';
  import { config } from '$lib/stores/config';
	import { link } from 'svelte-spa-router';
  import Icon from '../components/Icon.svelte';

  /**
   * DERIVED STATE (Svelte 5 runes)
   */
  const collections = $derived($config?.collections ?? []);
  const singletons = $derived($config?.singletons ?? []);
  const siteTitle = $derived($config?.title ?? 'FlatCMS');
</script>

<BaseLayout>
  <div>
    <header class="mb-8">
      <h1 class="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
        Dashboard
      </h1>
      <p class="text-neutral-500 dark:text-neutral-400 mt-2">
        Welcome to {siteTitle}. Here is an overview of your content.
      </p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Collections Card -->
      <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 transition-colors">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">
            Collections
          </h2>
          <span class="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700">
            {collections.length} Types
          </span>
        </div>

        <div class="space-y-2">
          {#each collections.slice(0, 5) as col}
            <a href="/collection/{col.slug || col.name}" use:link class="flex items-center justify-between p-2 -mx-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors group"
            >
              <div class="flex items-center gap-3 overflow-hidden">
                <Icon
                  name={col.icon || 'collection'}
                  class="w-5 h-5 flex items-center justify-center text-lg text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors"
                />
                <span class="text-neutral-700 dark:text-neutral-300 font-medium group-hover:text-neutral-900 dark:group-hover:text-white truncate">
                  {col.label}
                </span>
              </div>
              <span class="text-neutral-400 dark:text-neutral-500 text-sm group-hover:translate-x-1 transition-transform">
                &rarr;
              </span>
            </a>
          {/each}

          {#if collections.length === 0}
            <p class="text-sm text-neutral-500 dark:text-neutral-400 italic">
              No collections defined.
            </p>
          {/if}

          {#if collections.length > 5}
            <p class="text-sm text-neutral-500 dark:text-neutral-400 text-center pt-2">
              ...and {collections.length - 5} more
            </p>
          {/if}
        </div>
      </div>

      <!-- Singletons Card -->
      <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 transition-colors">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">
            Singletons
          </h2>
          <span class="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700">
            {singletons.length} Pages
          </span>
        </div>

        <div class="space-y-2">
          {#each singletons.slice(0, 5) as single}
            <a href="/singleton/{single.slug || single.name}" use:link class="flex items-center justify-between p-2 -mx-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors group">
              <div class="flex items-center gap-3 overflow-hidden">
                <Icon
                  name={single.icon || 'singleton'}
                  class="w-5 h-5 flex items-center justify-center text-lg text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors"
                />
                <span class="text-neutral-700 dark:text-neutral-300 font-medium group-hover:text-neutral-900 dark:group-hover:text-white truncate">
                  {single.label}
                </span>
              </div>
              <span class="text-neutral-400 dark:text-neutral-500 text-sm group-hover:translate-x-1 transition-transform">
                Edit &rarr;
              </span>
            </a>
          {/each}

          {#if singletons.length === 0}
            <p class="text-sm text-neutral-500 dark:text-neutral-400 italic">
              No singletons defined.
            </p>
          {/if}

          {#if singletons.length > 5}
            <p class="text-sm text-neutral-500 dark:text-neutral-400 text-center pt-2">
              ...and {singletons.length - 5} more
            </p>
          {/if}
        </div>
      </div>

      <!-- Config Card -->
      <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 flex flex-col justify-between transition-colors">
        <div>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">
              Configuration
            </h2>
          </div>

          <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Manage your content types and site settings via the configuration builder.
          </p>

          <div class="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
            Provider:
            <span class="font-medium text-neutral-900 dark:text-white capitalize">
              {$config?.provider || 'Local'}
            </span>
          </div>
        </div>

        <div class="mt-4">
          <a href="/setup" use:link class="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            Edit Config
          </a>
        </div>
      </div>
    </div>
  </div>
</BaseLayout>
