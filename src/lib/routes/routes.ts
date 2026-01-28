import { wrap } from 'svelte-spa-router/wrap';

import Dashboard from '$lib/pages/Dashboard.svelte';
import ConfigBuilder from '$lib/pages/ConfigBuilder.svelte';
import Collection from '$lib/pages/Collection.svelte';
import Singleton from '$lib/pages/Singleton.svelte';
import Entry from '$lib/pages/Entry.svelte';
import NotFound from '$lib/pages/NotFound.svelte';

export const routes = {
  '/': Dashboard,
  '/setup': ConfigBuilder,
  '/collection/:collection': Collection,
  '/collection/:collection/new': wrap({
    component: Entry,
    props: { isNew: true }
  }),
  '/collection/:collection/edit/:id': Entry,
  '/singleton/:id': Singleton,
  '*': NotFound
};
