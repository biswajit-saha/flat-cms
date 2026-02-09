import { StorageProvider, type FlatCMSConfig } from '../../types/storage';
import { parseFile, stringifyFile } from '../../utils/parser';

// IndexedDB Helpers for persisting directory handles
const DB_NAME = 'FlatCMS_DB';
const STORE_NAME = 'handles';
const KEY = 'root_dir';

async function getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

async function saveHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(handle, KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function loadHandle(): Promise<FileSystemDirectoryHandle | null> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(KEY);
        request.onsuccess = () => resolve(request.result as FileSystemDirectoryHandle || null);
        request.onerror = () => reject(request.error);
    });
}

/**
 * LocalProvider uses the Web File System Access API to interact with the local disk.
 */
export class LocalProvider extends StorageProvider {
    constructor(config: FlatCMSConfig) {
        super('local', config);
    }

    private static dirHandle: FileSystemDirectoryHandle | null = null;

    async connect(): Promise<void> {
        if (!LocalProvider.dirHandle) {
            LocalProvider.dirHandle = await loadHandle();
        }

        if (LocalProvider.dirHandle) {
            const handle = LocalProvider.dirHandle as any;
            const permission = await handle.queryPermission({ mode: 'readwrite' });
            if (permission !== 'granted') {
                const request = await handle.requestPermission({ mode: 'readwrite' });
                if (request !== 'granted') {
                    throw new Error("Permission denied");
                }
            }
        } else {
            const pickedHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
            LocalProvider.dirHandle = pickedHandle;
            await saveHandle(pickedHandle);
        }
    }

    async hasAccess(): Promise<boolean> {
        if (!LocalProvider.dirHandle) {
            LocalProvider.dirHandle = await loadHandle();
        }
        if (!LocalProvider.dirHandle) return false;

        return (await (LocalProvider.dirHandle as any).queryPermission({ mode: 'readwrite' })) === 'granted';
    }

    private async getDirectoryHandle(path: string, create = false): Promise<FileSystemDirectoryHandle | undefined> {
        if (!LocalProvider.dirHandle) {
            await this.connect();
        }
        if (!LocalProvider.dirHandle) return undefined;

        let currentHandle = LocalProvider.dirHandle;
        const parts = path.split('/').filter(p => p);
        for (const part of parts) {
            try {
                currentHandle = await currentHandle.getDirectoryHandle(part, { create });
            } catch (e) {
                return undefined;
            }
        }
        return currentHandle;
    }

    async listEntries(folder: string, extension: string, format: 'frontmatter' | 'json'): Promise<any[]> {
        const dirHandle = await this.getDirectoryHandle(folder);
        if (!dirHandle) return [];

        const entries = [];
        // @ts-ignore
        for await (const handle of dirHandle.values()) {
            if (handle.kind === 'file' && handle.name.endsWith(`.${extension}`)) {
                const id = handle.name.replace(`.${extension}`, '');
                const entryContent = await this.getEntry(folder, id, extension, format);
                entries.push(entryContent);
            }
        }
        return entries;
    }

    async getEntry(folder: string, id: string, extension: string, format: 'frontmatter' | 'json'): Promise<any> {
        const dirHandle = await this.getDirectoryHandle(folder);
        if (!dirHandle) throw new Error(`Directory not found: ${folder}`);

        try {
            const fileHandle = await dirHandle.getFileHandle(`${id}.${extension}`);
            const file = await fileHandle.getFile();
            const text = await file.text();

            // Delegate parsing to the utility
            const data = parseFile(text, format);

            // Remove the first leading newline from the content, which is often added by parsers.
            if (format === 'frontmatter' && data.content && typeof data.content === 'string') {
                data.content = data.content.replace(/^(\r\n|\n)/, '');
            }

            return { ...data, id };
        } catch (e) {
            console.error("Failed to get entry", e);
            throw e;
        }
    }

    async saveEntry(folder: string, id: string, data: any, extension: string, format: 'frontmatter' | 'json'): Promise<void> {
        const dirHandle = await this.getDirectoryHandle(folder, true);
        if (!dirHandle) throw new Error("Could not access directory.");

        const fileHandle = await dirHandle.getFileHandle(`${id}.${extension}`, { create: true });
        const writable = await fileHandle.createWritable();

        // Delegate stringification to the utility
        const fileContent = stringifyFile(data, format);

        await writable.write(fileContent);
        await writable.close();
    }

    async deleteEntry(folder: string, id: string, extension: string): Promise<void> {
        const dirHandle = await this.getDirectoryHandle(folder);
        if (!dirHandle) return;

        try {
            await dirHandle.removeEntry(`${id}.${extension}`);
        } catch (e: any) {
            if (e.name === 'NotFoundError') return;
            throw new Error(`Failed to delete entry: ${e.message}`);
        }
    }
}