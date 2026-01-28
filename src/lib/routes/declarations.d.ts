declare module '*.svelte' {
  import type { Component } from 'svelte';
  const component: Component;
  export default component;
}

declare module 'svelte-spa-router/wrap' {
  import type { Component } from 'svelte';
  interface WrapOptions {
    component: Component;
    props?: Record<string, any>;
    userData?: any;
    conditions?: Array<(detail: any) => boolean | Promise<boolean>>;
  }
  export function wrap(options: WrapOptions): Component;
}
