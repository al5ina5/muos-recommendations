import path from 'path';
// File paths
export const CACHE_FILE = path.join(process.cwd(), '.cache', 'cache.json');
export const SETTINGS_FILE = path.join(process.cwd(), '.cache', 'settings.json');
export const COLLECTION_CACHE_DIR = path.join(process.cwd(), '.cache', 'collections');
// ROM file extensions supported by the tool
export const ROM_EXTENSIONS = [
    'gba', 'gbc', 'gb',
    'sfc', 'smc', 'smk', 'snes',
    'nes', 'fc',
    'md', 'gen', 'bin', 'smd',
    'cue', 'chd', 'pbp', 'iso', 'img',
    'nds', 'ds',
    'zip', '7z',
    'sh', 'port', 'png', 'm3u', 'scummvm', 'p8', 'p8.png'
];
// ROM extensions formatted for use in Unix find command (with wildcard prefix)
export const ROM_EXTENSIONS_FIND = ROM_EXTENSIONS.map(ext => `*.${ext}`);
