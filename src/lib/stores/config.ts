import { writable } from 'svelte/store'

export interface FieldConfig {
  name: string;
  label?: string;
  type: 'text' | 'textarea' | 'date' | 'boolean' | 'list' | 'markdown' | 'number';
  required?: boolean;
  default?: string | number | boolean;
  column?: 'left' | 'right';
  [key: string]: any;
}

export interface ColumnConfig {
  name: string;
  label: string;
}

export interface CollectionConfig {
  name: string;
  label: string;
  icon?: string;
  path: string;
  extension: 'md' | 'mdx' | 'json';
  format: 'frontmatter' | 'json';
  identifier_field: string;
  filename?: string; // e.g., "{year}-{month}-{day}-{slug}"
  fields: FieldConfig[];
  columns?: ColumnConfig[];
  sort?: {
    key: string;
    direction: 'asc' | 'desc';
  };
  slug?: string; // Added for routing fallback
}

export interface SingletonConfig {
  name: string;
  label: string;
  path: string;
  format: 'frontmatter' | 'json';
  fields: FieldConfig[];
  icon?: string;
  slug?: string;
}

export interface FlatCMSConfig {
  title: string;
  logo?: string;
  logo_dark?: string;
  provider: 'local' | 'github' | 'auto';
  media_folder: string;
  public_folder: string;
  collections: CollectionConfig[];
  singletons: SingletonConfig[];
}

// Initialize store with null
export const config = writable<FlatCMSConfig | null>(null)

export async function loadConfig(): Promise<FlatCMSConfig | null> {
  try {
    const res = await fetch('config.json')
    if (!res.ok) {
      config.set(null)
      return null
    }
    const cfg: FlatCMSConfig = await res.json()
    config.set(cfg)
    return cfg
  } catch (err) {
    console.error('Failed to load CMS config:', err)
    config.set(null)
    return null
  }
}