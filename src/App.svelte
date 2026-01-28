<script lang="ts">
  import Router, { push } from 'svelte-spa-router';
  import { routes } from './lib/routes/routes';
  import { onMount } from 'svelte';

  onMount(async () => {
    // ✅ Config check stays the same
    try {
      const { loadConfig } = await import('$lib/stores/config');

      const cfg = await loadConfig();
      const valid = cfg && Object.keys(cfg).length > 0;

      if (!valid && location.hash !== '#/setup') {
        push('/setup');
      }
    } catch {
      if (location.hash !== '#/setup') push('/setup');
    }
  });
</script>

<main class="bg-neutral-50 dark:bg-neutral-950 min-h-screen transition-colors duration-200">
  <Router {routes} />
</main>
