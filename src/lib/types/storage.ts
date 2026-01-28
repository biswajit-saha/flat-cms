export type ProviderType = 'local' | 'github' | 'gitlab' | 'bitbucket';

export interface Field {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'markdown' | 'date' | 'boolean' | 'number' | 'image' | 'list';
    required?: boolean;
    default?: any;
    hint?: string;
    column?: string;
}

export interface Collection {
    name: string;
    label: string;
    path: string;
    extension: string;
    format: 'frontmatter' | 'json';
    identifier_field: string;
    filename?: string;
    icon?: string;
    columns?: Array<{ name: string; label: string }>;
    fields: Field[];
    type?: 'collection' | 'singleton';
    slug?: string;
    sort?: { key: string; direction: 'asc' | 'desc' };
}

export interface FlatCMSConfig {
    title: string;
    provider: ProviderType | 'auto';
    logo?: string;
    logo_dark?: string;
    media_folder?: string;
    public_folder?: string;
    collections: Collection[];
    singletons: Collection[];
}

export abstract class StorageProvider {
    public readonly type: ProviderType;
    protected config: FlatCMSConfig;

    constructor(type: ProviderType, config: FlatCMSConfig) {
        this.type = type;
        this.config = config;
    }

    abstract listEntries(folder: string, extension: string, format: string): Promise<any[]>;
    abstract getEntry(folder: string, id: string, extension: string, format: string): Promise<any>;
    abstract saveEntry(folder: string, id: string, data: any, extension: string, format: string): Promise<void>;
    abstract deleteEntry(folder: string, id: string, extension: string): Promise<void>;
    abstract connect(): Promise<void>;
    abstract hasAccess(): Promise<boolean>;
}