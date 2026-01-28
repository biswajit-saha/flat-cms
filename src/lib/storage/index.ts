import { LocalProvider } from './providers/LocalProvider';
import type { FlatCMSConfig, StorageProvider } from '../types/storage';

export function createStorageProvider(config: FlatCMSConfig): StorageProvider {
    let providerType = config.provider;

    if (providerType === 'auto') {
        providerType = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') 
            ? 'local' 
            : 'github';
    }

    switch (providerType) {
        case 'local':
            return new LocalProvider(config);
        default:
            throw new Error(`Provider ${providerType} not implemented`);
    }
}
