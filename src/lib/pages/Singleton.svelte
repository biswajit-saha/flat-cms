<script lang="ts">
  import BaseLayout from '$lib/components/BaseLayout.svelte';
  import { config } from '$lib/stores/config';
  import { storage } from '$lib/stores/storage';
  import { push, replace } from 'svelte-spa-router';
  import { fieldComponents, defaultFieldComponent as fallbackField } from '$lib/components/fields';

  // 1. Accept the 'route' prop from the Svelte 5 router
  let { params = { id: '' } } = $props();

  // 2. Derive the ID so it updates if the URL parameter changes
  const id = $derived(params.id);

  const singleton = $derived($config?.singletons?.find(s => (s.slug || s.name) === id));
  const fields = $derived(singleton?.fields || []);
  
  // Parse path to get folder, filename, and extension since singletons define a full path
  const pathInfo = $derived.by(() => {
    const s = singleton;
    if (!s?.path) return { folder: '', name: '', extension: '' };
    const parts = s.path.split('/');
    const filename = parts.pop() || '';
    const folder = parts.join('/');
    const extIndex = filename.lastIndexOf('.');
    const extension = extIndex > 0 ? filename.substring(extIndex + 1) : '';
    const name = extIndex > 0 ? filename.substring(0, extIndex) : filename;
    return { folder, name, extension };
  });

  const mainFields = $derived(fields.filter(f => ['title', 'content', 'left'].includes(f.column || '') || f.name === 'title' || f.name === 'content'));
  const sidebarFields = $derived(fields.filter(f => !['title', 'content', 'left'].includes(f.column || '') && f.name !== 'title' && f.name !== 'content'));

  let data = $state<Record<string, any>>({});
  let loading = $state(true);
  let saving = $state(false);

  $effect(() => {
    if ($config && id && !singleton) {
      replace('/404');
      return;
    }

    if (!singleton || !$storage) return;

    loading = true;
    
    const loadData = async () => {
      if ('hasAccess' in $storage) {
        const hasAccess = await ($storage as any).hasAccess();
        if (!hasAccess) {
          // Don't try to load data. Initialize with default data.
          const initialData: Record<string, any> = {};
          for (const field of fields) {
              if (field.default !== undefined) {
                  initialData[field.name] = field.default === 'now' ? new Date().toISOString().split('T')[0] : field.default;
              } else {
                  initialData[field.name] = null;
              }
          }
          data = initialData;
          loading = false;
          return;
        }
      }
      try {
        const entryData = await $storage.getEntry(
          pathInfo.folder,
          pathInfo.name,
          pathInfo.extension,
          singleton!.format
        );
        
        const initialData: Record<string, any> = {};
        for (const field of fields) {
            if (entryData && entryData[field.name] !== undefined) {
                initialData[field.name] = entryData[field.name];
            } else if (field.default !== undefined) {
                initialData[field.name] = field.default === 'now' ? new Date().toISOString().split('T')[0] : field.default;
            } else {
                initialData[field.name] = null;
            }
        }
        data = initialData;

      } catch (err) {
        // This is expected if the file doesn't exist yet
        const initialData: Record<string, any> = {};
        for (const field of fields) {
            if (field.default !== undefined) {
                initialData[field.name] = field.default === 'now' ? new Date().toISOString().split('T')[0] : field.default;
            } else {
                initialData[field.name] = null;
            }
        }
        data = initialData;
      } finally {
        loading = false;
      }
    };

    loadData();
  });

  async function handleSave() {
    if (!singleton || !$storage) {
      alert('Cannot save: configuration or storage not available.');
      return;
    }

    saving = true;
    try {
      await $storage.saveEntry(
        pathInfo.folder,
        pathInfo.name,
        data,
        pathInfo.extension,
        singleton!.format
      );
      // TODO: Show success notification
    } catch (err) {
      console.error('Save failed:', err);
      alert('Save failed: ' + (err as Error).message);
    } finally {
      saving = false;
    }
  }
</script>

<BaseLayout>
  {#if loading}
    <div class="p-12 text-center text-neutral-500">Loading...</div>
  {:else if !singleton && !loading}
    <div class="p-12 text-center text-red-500">Singleton configuration for "{id}" not found.</div>
  {:else}
    <div>
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">{singleton?.label || singleton?.name}</h1>
          {#if (singleton as any)?.description}
            <p class="mt-2 text-neutral-600 dark:text-neutral-400">{(singleton as any).description}</p>
          {/if}
        </div>
        <div class="flex gap-3">
          <button 
            onclick={() => push('/')}
            class="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onclick={handleSave}
            disabled={saving}
            class="px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 bg-neutral-900 dark:bg-white rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 md:p-8 transition-colors">
            <div class="space-y-6">
              {#each mainFields as field}
                {@const Component = fieldComponents[field.type] || fallbackField}
                <Component label={field.label || field.name} required={field.required} bind:value={data[field.name]} />
              {/each}
            </div>
          </div>
        </div>
        <div class="space-y-6">
          <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 transition-colors">
            <div class="space-y-6">
              {#each sidebarFields as field}
                {@const Component = fieldComponents[field.type] || fallbackField}
                <Component label={field.label || field.name} required={field.required} bind:value={data[field.name]} />
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</BaseLayout>