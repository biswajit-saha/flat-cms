<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '@mateothegreat/svelte5-router';

  onMount(() => {
    // Navigate back to the dashboard/home
    goto('/');
  });
</script>

<div></div>