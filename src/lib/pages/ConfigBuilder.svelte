<!-- src/lib/pages/ConfigBuilder.svelte -->
<script lang="ts">
    import BaseLayout from '../components/BaseLayout.svelte'
    import { writable } from "svelte/store";

    let collections = writable([]);

    function addCollection() {
        console.log("Adding new collection...");
    }

    function saveConfig() {
        console.log("Saving config...");
    }
</script>

<BaseLayout>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-neutral-900 dark:text-white tracking-tight">Configuration Builder</h1>
    <p class="mb-6 text-neutral-600 dark:text-neutral-400">
      Your `config.json` file was not found. Use this tool to create it.
      Define your content types (Collections) and their fields below.
    </p>

    <div class="space-y-8">
      <div class="bg-white dark:bg-neutral-900 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 transition-colors">
        <h2 class="text-xl font-semibold text-neutral-900 dark:text-white">No collections yet.</h2>
        <p class="text-neutral-500 dark:text-neutral-400 mt-1">Add a collection to get started.</p>
      </div>
    </div>

    <div class="mt-8 flex gap-4">
      <button on:click={addCollection} class="bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-medium py-2 px-4 rounded-lg transition-colors shadow-sm">
        Add Collection
      </button>
      <button on:click={saveConfig} class="bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 font-medium py-2 px-4 rounded-lg transition-colors shadow-sm">
        Download config.json
      </button>
    </div>
  </div>
</BaseLayout>
