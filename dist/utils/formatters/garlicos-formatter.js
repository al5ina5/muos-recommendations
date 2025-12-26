import path from 'path';
// GarlicOS system ID mapping
const GARLICOS_SYSTEM_IDS = {
    'GBA': 'GBA',
    'SNES': 'SFC',
    'NES': 'FC',
    'Genesis': 'MD',
    'PS1': 'PS',
    'GB': 'GB',
    'GBC': 'GBC',
    'Arcade': 'ARCADE',
    'N64': 'N64',
    'PCE': 'PCE',
    'NEOGEO': 'NEOGEO',
    'PICO8': 'PICO8',
    'PORTS': 'PORTS',
    'NDS': 'NDS',
    'PSP': 'PSP',
    'DREAMCAST': 'DREAMCAST',
    'GG': 'GG',
    'NGPC': 'NGPC'
};
export class GarlicOSFormatter {
    formatGame(game, match, options, relativePath) {
        // For GarlicOS, we format individual game entries for M3U
        // The main code will collect these and write as one M3U file per collection per system
        const cleanName = game.display || game.name;
        const orderPrefix = options.useNumbers ? `${(options.index + 1).toString().padStart(2, '0')}. ` : '';
        const gameDisplayName = match ? `${orderPrefix}${cleanName}` : `${orderPrefix}[X] ${cleanName}`;
        // Use relative path if provided, otherwise use absolute path
        const romPath = relativePath || (match ? match.path : `/mnt/ROM_NOT_FOUND/${game.system}/${game.name}`);
        // M3U format: #EXTINF:0,Display Name\n/path/to/rom
        return `#EXTINF:0,${gameDisplayName}\n${romPath}\n`;
    }
    getFileExtension() {
        return '.m3u';
    }
    getCollectionPath(basePath, collectionTitle, system) {
        // GarlicOS natively only supports one favorites list per system
        // Files go in: /FAVORITES/[SYSTEM].m3u (e.g., /FAVORITES/GBA.m3u)
        // Note: GarlicOS doesn't support multiple collections natively - only one favorites list per system
        return path.join(basePath, 'FAVORITES');
    }
    getSystemId(system) {
        return GARLICOS_SYSTEM_IDS[system] || system;
    }
}
