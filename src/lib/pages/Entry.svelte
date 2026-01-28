<script lang="ts">
  import BaseLayout from '$lib/components/BaseLayout.svelte'
  import { config } from '$lib/stores/config';
  import { storage } from '$lib/stores/storage'
  import { push, location, replace } from 'svelte-spa-router'
  import { fieldComponents, defaultFieldComponent } from '$lib/components/fields';
  import Icon from '../components/Icon.svelte'
  import type { CollectionConfig } from '$lib/stores/config';

  /* ─────────────────────────────────────────────
   * PROPS
   * ───────────────────────────────────────────── */
  let { params = { collection: '', id: '' }, isNew = false } = $props();
  
  /* ─────────────────────────────────────────────
   * DERIVED STATE
   * ───────────────────────────────────────────── */
  // Decode params to handle special characters in slugs/ids
  // Fallback to location parsing if params are empty (common with svelte-spa-router wrap/transitions)
  const collectionSlug = $derived.by(() => {
    if (params.collection) return decodeURIComponent(params.collection);
    const parts = $location.split('/');
    if (parts[1] === 'collection') return decodeURIComponent(parts[2] || '');
    return '';
  });

  const entryId = $derived.by(() => {
    if (params.id) return decodeURIComponent(params.id);
    const parts = $location.split('/');
    if (parts[1] === 'collection' && parts[3] === 'edit') return decodeURIComponent(parts[4] || '');
    return '';
  });

  // Determine mode based on props or ID
  const isCreateMode = $derived.by(() => {
    if (isNew) return true;
    if (entryId === 'new') return true;
    return $location.includes('/new');
  });

  // Derived signature to detect route changes before effect runs
  const currentSignature = $derived(`${collectionSlug}:${isCreateMode ? 'NEW' : entryId}`);

  // Resolve Collection Config
  let collection = $derived(
    $config?.collections?.find(c => (c.slug || c.name) === collectionSlug) as CollectionConfig | undefined
  );

  let fields = $derived(collection?.fields || []);

  // Layout: Split fields into main (left) and sidebar (right)
  let leftFields = $derived(fields.filter(f => 
    ['title', 'content', 'left'].includes(f.column || '') || f.name === 'title' || f.name === 'content'
  ));
  
  let rightFields = $derived(fields.filter(f => 
    !['title', 'content', 'left'].includes(f.column || '') && f.name !== 'title' && f.name !== 'content'
  ));

  /* ─────────────────────────────────────────────
   * STATE
   * ───────────────────────────────────────────── */
  let entry = $state<Record<string, any>>({});
  let isLoading = $state(true);
  let isSubmitting = $state(false);
  let errors = $state<Record<string, string>>({});
  
  // Track the ID of the currently loaded entry to handle renames
  let loadedId = $state<string | undefined>();
  
  // Internal signature to prevent redundant reloads
  let loadSignature = $state('');

  /* ─────────────────────────────────────────────
   * DATA LOADING
   * ───────────────────────────────────────────── */
  $effect(() => {
    // Config is absolutely required
    if (!$config) return;

    // Storage is required for editing, but we can render the "New" form without it (saving will fail later)
    // This prevents infinite loading if storage takes a moment to init or fails
    if (!$config || (!isCreateMode && !$storage)) return;

    // If collection slug is missing (e.g. initial route mount), wait
    if (!collectionSlug) return;

    if ($config && collectionSlug && !collection) {
      replace('/404');
      return;
    }

    if (loadSignature !== currentSignature) {
      loadSignature = currentSignature;
      loadData();
    }
  });

  async function loadData() {
    // If collection config is missing, we can't load anything
    if (!collection) {
      isLoading = false;
      return;
    }
    
    isLoading = true;
    errors = {};

    try {
      let data: Record<string, any> = {};

      if (isCreateMode) {
        // CASE: NEW ENTRY
        loadedId = undefined;
      } else if (entryId && $storage) {
        // CASE: EDIT ENTRY
        data = await $storage.getEntry(
          collection.path || collection.name,
          entryId, 
          collection.extension || 'md',
          collection.format || 'frontmatter'
        );
        loadedId = entryId;
      }

      // ─────────────────────────────────────────────
      // CRITICAL: DATA NORMALIZATION
      // Svelte 5 crashes if you bind:value={undefined}.
      // We must ensure every field in the config exists in the entry object.
      // ─────────────────────────────────────────────
      const safeEntry: Record<string, any> = {};
      
      for (const f of fields) {
        if (data[f.name] !== undefined) {
          safeEntry[f.name] = data[f.name];
        } else {
          // Apply default or null
          if (f.default !== undefined) {
             safeEntry[f.name] = f.default === 'now' 
              ? new Date().toISOString().split('T')[0] 
              : f.default;
          } else {
            safeEntry[f.name] = null;
          }
        }
      }

      // Preserve ID if editing
      if (!isCreateMode) {
        safeEntry.id = entryId;
      }

      entry = safeEntry;

    } catch (error) {
      console.error("Failed to load entry", error);
      if (error instanceof Error && error.name === 'NotFoundError') {
        replace('/404');
        return;
      }
      alert("Failed to load entry data.");
    } finally {
      isLoading = false;
    }
  }

  /* ─────────────────────────────────────────────
   * ACTIONS
   * ───────────────────────────────────────────── */
  function validate() {
    errors = {};
    fields.forEach(field => {
      if (field.required && !entry[field.name]) {
        errors[field.name] = `${field.label || field.name} is required`;
      }
    });
    const isValid = Object.keys(errors).length === 0;
    if (!isValid) console.warn('[validate] Errors:', errors);
    return isValid;
  }

  async function save() {
    if (!collection) return;
    
    if (!$storage) {
      alert('Storage is not ready. Cannot save.');
      return;
    }

    if (!validate()) {
      alert('Please check the form for errors.');
      return;
    }

    isSubmitting = true;
    let filename = entryId || '';

    if (isCreateMode) {
      // Generate filename from identifier field
      const identifier = entry[collection.identifier_field || 'title'] || crypto.randomUUID();
      filename = String(identifier)
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
      entry.id = filename;
    }

    if (!filename) {
      isSubmitting = false;
      return;
    }

    try {
      const path = collection.path || collection.name;
      const ext = collection.extension || 'md';

      // Handle Rename: If ID changed, delete old file
      if (!isCreateMode && loadedId && loadedId !== filename) {
        await $storage.deleteEntry(path, loadedId, ext);
      }

      await $storage.saveEntry(
        path, 
        filename, 
        entry, 
        ext,
        collection.format || 'frontmatter'
      );

      push(`/collection/${collectionSlug}`);
    } catch (e: any) {
      console.error(e);
      alert("Save failed: " + e.message);
    } finally {
      isSubmitting = false;
    }
  }

  async function deleteEntry() {
    if (isCreateMode || !$storage || !collection || !entryId) return;
    if (!confirm(`Are you sure you want to delete this entry?`)) return;

    isSubmitting = true;
    try {
      await $storage.deleteEntry(
        collection.path || collection.name,
        entryId,
        collection.extension || 'md'
      );
      push(`/collection/${collectionSlug}`);
    } catch (e: any) {
      console.error(e);
      alert("Delete failed: " + e.message);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<BaseLayout>
  <div>
    <!-- HEADER -->
    <div class="flex items-center justify-between mb-8">
        <div>
            <h1 class="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
                {isCreateMode ? 'Create New' : 'Edit'} {collection?.label || collection?.name}
            </h1>
            <p class="text-neutral-600 dark:text-neutral-400 mt-2">
                {isCreateMode ? 'Add a new entry to this collection.' : 'Update existing entry details.'}
            </p>
        </div>
        <div class="flex gap-3">
            <button onclick={() => push(`/collection/${collectionSlug}`)} class="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors cursor-pointer">
                Cancel
            </button>
            <button onclick={save} disabled={isSubmitting} class="px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 bg-neutral-900 dark:bg-white rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer disabled:opacity-50">
                {isSubmitting ? 'Saving...' : 'Save Entry'}
            </button>
        </div>
    </div>

    <!-- CONTENT -->
    {#if !$storage && !isCreateMode}
        <div class="p-12 text-center text-red-500">Storage not initialized (required for editing).</div>
    {:else if !collection && !isLoading}
        <div class="p-12 text-center text-neutral-500">Collection not found.</div>
    {:else if isLoading || loadSignature !== currentSignature}
        <div class="flex justify-center py-20 text-neutral-500">Loading...</div>
    {:else}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- LEFT COLUMN (Main Content) -->
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 md:p-8 transition-colors">
                    <div class="space-y-6">
                        {#each leftFields as field}
                          {@const FieldComponent = fieldComponents[field.type] || defaultFieldComponent}
                          <div class="relative">
                            <FieldComponent
                                bind:value={entry[field.name]}
                                label={field.label || field.name}
                                required={field.required}
                            />
                            {#if errors[field.name]}
                                <span class="text-xs text-red-500 mt-1">{errors[field.name]}</span>
                            {/if}
                          </div>
                        {/each}
                    </div>
                </div>
            </div>

            <!-- RIGHT COLUMN (Sidebar) -->
            <div class="space-y-6">
                <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 transition-colors">
                    <div class="space-y-6">
                      {#each rightFields as field}
                            {@const FieldComponent = fieldComponents[field.type] || defaultFieldComponent}
                            <div class="relative">
                                <FieldComponent
                                    bind:value={entry[field.name]}
                                    label={field.label || field.name}
                                    required={field.required}
                                />
                                {#if errors[field.name]}
                                    <span class="text-xs text-red-500 mt-1">{errors[field.name]}</span>
                                {/if}
                            </div>
                        {/each}
                    </div>

                    {#if !isCreateMode}
                      <div class="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                        <button 
                          onclick={deleteEntry}
                          disabled={isSubmitting}
                          class="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Icon name="trash" class="w-4 h-4" />
                          {isSubmitting ? 'Deleting...' : 'Delete Entry'}
                        </button>
                      </div>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
  </div>
</BaseLayout>
