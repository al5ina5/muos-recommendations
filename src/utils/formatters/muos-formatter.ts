import { ICollectionFormatter, FormatGameOptions } from '../collection-formatter.js';
import { Recommendation } from '../../data/recommendations.js';
import { RomFile } from '../matcher.js';
import path from 'path';

const MUOS_SYSTEM_IDS: Record<string, string> = {
    'GBA': 'GBA',
    'SNES': 'SNES',
    'NES': 'NES',
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

export class MuOSFormatter implements ICollectionFormatter {
    formatGame(game: Recommendation, match: RomFile | null, options: FormatGameOptions, relativePath?: string): string {
        const cleanName = game.display || game.name;
        const orderPrefix = options.useNumbers ? `${(options.index + 1).toString().padStart(2, '0')}. ` : '';
        const gameDisplayName = match ? `${orderPrefix}${cleanName}` : `${orderPrefix}[X] ${cleanName}`;
        const romPath = match ? match.path : `/mnt/ROM_NOT_FOUND/${game.system}/${game.name}`;
        const systemId = this.getSystemId(game.system);

        // muOS format: romPath \n systemID \n gameDisplayName
        return `${romPath}\n${systemId}\n${gameDisplayName}\n`;
    }

    getFileExtension(): string {
        return '.cfg';
    }

    getCollectionPath(basePath: string, collectionTitle: string, system?: string): string {
        // muOS uses: /mnt/mmc/MUOS/info/collection/[CollectionName]
        return path.join(basePath, 'MUOS', 'info', 'collection');
    }

    getSystemId(system: string): string {
        return MUOS_SYSTEM_IDS[system] || system;
    }
}

