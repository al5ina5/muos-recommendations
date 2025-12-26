import path from 'path';
// SpruceOS system name mapping (may be same as muOS, but keeping separate for clarity)
const SPRUCEOS_SYSTEM_IDS = {
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
export class SpruceOSFormatter {
    formatGame(game, match, options, relativePath) {
        // For SpruceOS, formatGame returns JSON string for a single game entry
        // This will be used to build the game_list array
        const systemId = this.getSystemId(game.system);
        const romPath = match ? match.path : `/mnt/ROM_NOT_FOUND/${game.system}/${game.name}`;
        const gameEntry = {
            rom_file_path: romPath,
            game_system_name: systemId
        };
        return JSON.stringify(gameEntry);
    }
    formatCollection(collectionName, games) {
        const gameList = [];
        for (const { game, match, options } of games) {
            if (!match && options.missingHandle === 'omit')
                continue;
            const systemId = this.getSystemId(game.system);
            const romPath = match ? match.path : `/mnt/ROM_NOT_FOUND/${game.system}/${game.name}`;
            gameList.push({
                rom_file_path: romPath,
                game_system_name: systemId
            });
        }
        return {
            collection_name: collectionName,
            game_list: gameList
        };
    }
    getFileExtension() {
        return '.json';
    }
    getCollectionPath(basePath, collectionTitle, system) {
        // SpruceOS uses: /mnt/sdcard/Collections/collections.json
        return path.join(basePath, 'Collections');
    }
    getSystemId(system) {
        return SPRUCEOS_SYSTEM_IDS[system] || system;
    }
}
