<script lang="ts">
  import { link, location } from 'svelte-spa-router';
  import { config } from '$lib/stores/config';
  import { storage, initStorage } from '$lib/stores/storage';
  import Icon from './Icon.svelte';
  import type { FlatCMSConfig } from '$lib/types/storage';

  let { children } = $props();

  /**
   * REACTIVITY
   * We derive currentPath from the svelte-spa-router location store
   * so the UI updates instantly on every navigation.
   */
  let currentPath = $derived($location);
  
  // Initialize state from localStorage
  let isSidebarExpanded = $state(
    typeof localStorage !== 'undefined' ? localStorage.getItem('sidebarExpanded') !== 'false' : true
  );
  
  let isDark = $state(
    typeof localStorage !== 'undefined' ? localStorage.getItem('theme') === 'dark' : false
  );

  let isMobileOpen = $state(false);
  let needsPermission = $state(false);

  $effect(() => {
    // Initialize storage if config is loaded but storage is not ready
    if ($config && !$storage) {
      initStorage($config as unknown as FlatCMSConfig);
    }
  });

  async function checkPermission() {
    if (!$storage || !$config) return;
    const isLocal = $config.provider === 'local' || ($config.provider === 'auto' && typeof window !== 'undefined' && window.location.hostname === 'localhost');
    
    if (isLocal && 'hasAccess' in $storage) {
      const hasAccess = await ($storage as any).hasAccess();
      needsPermission = !hasAccess;
    } else {
      needsPermission = false;
    }
  }

  $effect(() => {
    checkPermission();
  });

  async function requestPermission() {
    if ($storage && 'connect' in $storage) {
      try {
        await ($storage as any).connect();
        await checkPermission();
      } catch (e) {
        console.error('Permission request failed', e);
      }
    }
  }
  
  $effect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  });

  $effect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) isMobileOpen = false;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  const isActive = (path: string) => path === '/' 
    ? currentPath === '/' 
    : currentPath.startsWith(path);

  /**
   * BREADCRUMBS
   * Automatically computed based on the current reactive path.
   */
  let breadcrumbs = $derived.by(() => {
    const path = currentPath;
    let items: { label: string; href?: string }[] = [{ label: 'Dashboard', href: '/' }];
    
    if (path.startsWith('/setup')) {
      items.push({ label: 'Setup' });
    } else if (path.startsWith('/collection/')) {
      const parts = path.split('/');
      const id = decodeURIComponent(parts[2] || '');
      const col = $config?.collections?.find(c => (c.slug || c.name) === id);
      const label = col?.label || col?.name || id;
      
      if (parts.length > 3) {
        items.push({ label, href: `/collection/${id}` });
        if (parts[3] === 'new') items.push({ label: 'New' });
        else items.push({ label: 'Edit' });
      } else {
        items.push({ label });
      }
    } else if (path.startsWith('/singleton/')) {
      const id = decodeURIComponent(path.split('/')[2] || '');
      const sing = $config?.singletons?.find(s => (s.slug || s.name) === id);
      items.push({ label: sing?.label || sing?.name || id });
    }
    return items;
  });

  function toggleTheme() {
    isDark = !isDark;
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  function toggleMobileMenu() {
    isMobileOpen = !isMobileOpen;
  }

  function toggleDesktopSidebar() {
    isSidebarExpanded = !isSidebarExpanded;
    localStorage.setItem('sidebarExpanded', String(isSidebarExpanded));
  }

  let title = $derived($config?.title || 'FlatCMS');
  let firstLetter = $derived(title.charAt(0).toUpperCase());
  let logo = $derived($config?.logo);
  let logoDark = $derived($config?.logo_dark);

  let isNotFound = $derived(breadcrumbs.length === 1 && currentPath !== '/');
</script>

<div class="flex h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
  
  {#if isMobileOpen}
    <!-- Mobile backdrop -->
    <div class="fixed inset-0 bg-black/50 z-30 md:hidden" onclick={() => isMobileOpen = false} aria-hidden="true"></div>
  {/if}

  <aside class="fixed md:relative z-40 h-full flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-all duration-300 ease-in-out w-64 {isSidebarExpanded ? 'md:w-64' : 'md:w-17'} {isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 overflow-hidden">
    <div class="h-16 flex items-center {isSidebarExpanded || isMobileOpen ? 'justify-between px-4' : 'justify-center'} border-b border-neutral-200 dark:border-neutral-800 font-bold overflow-hidden shrink-0">
      <div class="flex items-center overflow-hidden whitespace-nowrap">
        {#if logo || logoDark}
          {#if logo}
            <img src={logo} alt={title} class="h-8 w-8 object-contain shrink-0 {logoDark ? 'block dark:hidden' : ''}" />
          {/if}
          {#if logoDark}
            <img src={logoDark} alt={title} class="h-8 w-8 object-contain shrink-0 hidden dark:block" />
          {/if}
        {:else}
          <div class="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center text-lg font-bold shrink-0">
            {firstLetter}
          </div>
        {/if}
        {#if isSidebarExpanded || isMobileOpen}<span class="ml-3 opacity-100 transition-opacity truncate">{title}</span>{/if}
      </div>
      <!-- Mobile Close Button -->
      <button class="md:hidden p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded cursor-pointer flex items-center justify-center" onclick={() => isMobileOpen = false}>
        <Icon name="x" class="w-5 h-5" />
      </button>
    </div>

    <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
      <a href="/" use:link
        onclick={() => isMobileOpen = false}
        class="flex items-center p-2.5 rounded-lg transition-colors whitespace-nowrap {isSidebarExpanded || isMobileOpen ? '' : 'justify-center'} {isActive('/') ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'}"
        title={!isSidebarExpanded && !isMobileOpen ? 'Dashboard' : undefined}>
        <Icon name="dashboard" class="w-6 h-6" />
        {#if isSidebarExpanded || isMobileOpen}<span class="ml-3">Dashboard</span>{/if}
      </a>

      {#if $config?.collections?.length}
          <div class="my-4 border-t border-neutral-200 dark:border-neutral-800"></div>
        {#each $config.collections as c}
          {@const path = `/collection/${c.slug || c.name}`}
          <a href={path} use:link
            onclick={() => isMobileOpen = false}
            class="flex items-center p-2.5 rounded-lg transition-colors whitespace-nowrap {isActive(path) ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'}"
            title={!isSidebarExpanded && !isMobileOpen ? (c.label || c.name) : undefined}>
            <Icon name={c.icon || 'collection'} class="w-6 h-6 text-2xl" />
            {#if isSidebarExpanded || isMobileOpen}<span class="ml-3">{c.label || c.name}</span>{/if}
          </a>
        {/each}
      {/if}

      {#if $config?.singletons?.length}
          <div class="my-4 border-t border-neutral-200 dark:border-neutral-800"></div>
        {#each $config.singletons as s}
          {@const path = `/singleton/${s.slug || s.name}`}
          <a href={path} use:link
            onclick={() => isMobileOpen = false}
            class="flex items-center p-2.5 rounded-lg transition-colors whitespace-nowrap {isActive(path) ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'}"
            title={!isSidebarExpanded && !isMobileOpen ? (s.label || s.name) : undefined}>
            <Icon name={s.icon || 'singleton'} class="w-6 h-6 text-2xl" />
            {#if isSidebarExpanded || isMobileOpen}<span class="ml-3">{s.label || s.name}</span>{/if}
          </a>
        {/each}
      {/if}

      <div class="mt-4  border-t border-neutral-200 dark:border-neutral-800 pt-4">
        <a href="/setup" use:link
          onclick={() => isMobileOpen = false}
          class="flex items-center p-2.5 rounded-lg transition-colors whitespace-nowrap {isActive('/setup') ? 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'}"
          title={!isSidebarExpanded && !isMobileOpen ? 'Setup' : undefined}>
          <Icon name="wrench" class="w-6 h-6" />
          {#if isSidebarExpanded || isMobileOpen}<span class="ml-3">Setup</span>{/if}
        </a>
      </div>
    </nav>
  </aside>

  <div class="flex-1 flex flex-col min-w-0">
    <header class="h-16 flex items-center justify-between px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
      <div class="flex items-center gap-4">
        <button onclick={toggleMobileMenu} class="md:hidden p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer flex items-center justify-center">
          <Icon name="menu" class="w-5 h-5" />
        </button>
        <button onclick={toggleDesktopSidebar} class="hidden md:block p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer">
          <div class="transition-transform duration-300 flex items-center justify-center {isSidebarExpanded ? '' : 'rotate-180'}">
            <Icon name="chevronLeft" class="w-5 h-5" />
          </div>
        </button>
        
        {#if !isNotFound}
          <nav class="flex items-center text-sm leading-none">
            {#each breadcrumbs as crumb, i}
              {#if i > 0}<span class="mx-2 text-neutral-300">/</span>{/if}
              {#if crumb.href && i < breadcrumbs.length - 1}
                <a href={crumb.href} use:link class="text-neutral-500 hover:text-black dark:hover:text-white transition-colors">{crumb.label}</a>
              {:else}
                <span class="font-semibold">{crumb.label}</span>
              {/if}
            {/each}
          </nav>
        {/if}
      </div>

      <button onclick={toggleTheme} class="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer flex items-center justify-center">
        <Icon name={isDark ? 'sun' : 'moon'} class="w-5 h-5" />
      </button>
    </header>

    <main class="flex-1 overflow-auto p-6">
      {#if needsPermission}
        <div class="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5 sm:mt-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div>
              <h3 class="font-semibold text-amber-900 dark:text-amber-100">Project Root Access Required</h3>
              <p class="text-sm text-amber-700 dark:text-amber-300 mt-1">Please select the folder containing your content to continue editing.</p>
            </div>
          </div>
          <button onclick={requestPermission} class="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-sm">
            Select Folder
          </button>
        </div>
      {/if}
      {@render children?.()}
    </main>
  </div>
</div>