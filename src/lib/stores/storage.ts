import { writable } from 'svelte/store';
import type { StorageProvider, FlatCMSConfig } from '../types/storage';
import { createStorageProvider } from '../storage';

export const storage = writable<StorageProvider | null>(null);

export function initStorage(config: FlatCMSConfig) {
  if (!config) return;
  storage.set(createStorageProvider(config));
}
