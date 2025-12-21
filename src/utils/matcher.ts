import Fuse from 'fuse.js';

export interface RomFile {
    name: string;      // Filename without extension
    fullName: string;  // Original filename with extension
    path: string;      // Full path on device
    system?: string;   // Detected system
}

export function normalizeName(name: string): string {
    let n = name.toLowerCase();

    // 0. Expand common abbreviations
    n = n.replace(/\btmnt\b/g, 'teenage mutant ninja turtles');

    // 1. Remove common tags and noise
    n = n.replace(/\(.*?\)/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\s+-\s+/g, ' ')
        .replace(/[:,!']/g, ' ');

    // 2. Handle specific transpositions
    if (n.includes(', the')) {
        n = 'the ' + n.replace(', the', '');
    }

    // 3. Remove common words that hinder matching
    n = n.replace(/\b(version|edition|the games)\b/g, '');

    // 4. Final strip
    return n.replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Returns a "base" version of the name by taking everything before the first colon or major dash.
 */
export function getBaseName(name: string): string {
    const parts = name.split(/[:\-]/);
    return normalizeName(parts[0]);
}

export class RomMatcher {
    private fuse: Fuse<RomFile>;
    private roms: RomFile[];

    constructor(roms: RomFile[]) {
        this.roms = roms;
        this.fuse = new Fuse(roms, {
            keys: ['name', 'fullName'],
            includeScore: true,
            threshold: 0.5,
        });
    }

    findMatch(targetName: string, systemContext?: string): RomFile | null {
        const normalizedTarget = normalizeName(targetName);
        const baseTarget = getBaseName(targetName);

        // Map common muOS system folder aliases
        const systemAliases: Record<string, string[]> = {
            'NES': ['nes', 'fc', 'famicom'],
            'SNES': ['snes', 'sfc', 'superfamicom'],
            'Genesis': ['genesis', 'md', 'megadrive'],
            'GBA': ['gba'],
            'GB': ['gb', 'gameboy'],
            'GBC': ['gbc', 'gameboycolor'],
            'PS1': ['ps', 'ps1', 'psx'],
            'Arcade': ['arcade', 'fbneo', 'mame', 'cps1', 'cps2', 'cps3', 'neogeo', 'atomiswave', 'naomi']
        };

        const currentAliases = systemContext ? (systemAliases[systemContext] || [systemContext.toLowerCase()]) : [];

        // 1. Try exact normalized match WITHIN the system folders
        const systemMatch = this.roms.find(rom => {
            const pathParts = rom.path.toLowerCase().split('/');
            const isInCorrectSystem = currentAliases.some(alias => pathParts.includes(alias));
            if (!isInCorrectSystem) return false;

            const normalizedRom = normalizeName(rom.name);
            return normalizedRom === normalizedTarget || normalizedRom === baseTarget;
        });
        if (systemMatch) return systemMatch;

        // 2. Fuzzy match WITHIN the system folders
        // We can be more permissive (0.8) because we are already locked to the correct system folder
        const results = this.fuse.search(targetName);
        if (results.length > 0) {
            const bestInSystem = results.find(r => {
                const pathParts = r.item.path.toLowerCase().split('/');
                const isInCorrectSystem = currentAliases.some(alias => pathParts.includes(alias));
                return isInCorrectSystem && r.score < 0.8;
            });
            if (bestInSystem) return bestInSystem.item;
        }

        return null;
    }
}
