import path from 'path';
export const CACHE_FILE = path.join(process.cwd(), '.cache', 'cache.json');
export const SETTINGS_FILE = path.join(process.cwd(), '.cache', 'settings.json');
export const COLLECTION_CACHE_DIR = path.join(process.cwd(), '.cache', 'collections');
