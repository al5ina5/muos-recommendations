import Fuse from 'fuse.js';

export interface RomFile {
    name: string;      // Filename without extension
    fullName: string;  // Original filename with extension
    path: string;      // Full path on device
    system?: string;   // Detected system
    parentDir?: string; // Parent directory name
}

export function normalizeName(name: string): string {
    if (!name) return '';

    // 1. Basic cleaning: lowercase and strip accents
    let n = name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remove accents

    // 4. Handle Roman Numerals (simple cases)
    // Only at the end of words or strings to avoid middle-of-word issues
    n = n.replace(/\bviii\b/g, '8')
        .replace(/\bvii\b/g, '7')
        .replace(/\bvi\b/g, '6')
        .replace(/\biv\b/g, '4')
        .replace(/\bv\b/g, '5')
        .replace(/\biii\b/g, '3')
        .replace(/\bii\b/g, '2')
        .replace(/\bi\b/g, '1');

    // 5. Expand common abbreviations (especially for Arcade/Ports)
    n = n.replace(/\btmnt\b/g, 'teenage mutant ninja turtles')
        .replace(/\bsf([0-9])\b/g, 'street fighter $1')
        .replace(/\bsf\b/g, 'street fighter')
        .replace(/\bkof([0-9]+)\b/g, 'king of fighters $1')
        .replace(/\bkof\b/g, 'king of fighters')
        .replace(/\bmk([0-9])\b/g, 'mortal kombat $1')
        .replace(/\bmk\b/g, 'mortal kombat')
        .replace(/\bmslug\b/g, 'metal slug')
        .replace(/\bsm64\b/g, 'super mario 64')
        .replace(/\boot\b/g, 'ocarina of time');

    // 6. Handle specific transpositions like ", the" or ", a"
    n = n.replace(/,\s*(the|a|an)\b/g, ' ');

    // 7. Remove common tags and noise
    n = n.replace(/\(.*?\)/g, ' ')
        .replace(/\[.*?\]/g, ' ')
        .replace(/\s+-\s+/g, ' ')
        .replace(/[:,!']+/g, ' ');

    // 8. Remove stop words that hinder matching
    n = n.replace(/\b(the|of|a|an|and|&|with)\b/g, ' ');

    // 9. Remove common metadata words
    n = n.replace(/\b(version|edition|the games|complete|prototype|demo|classic|remastered|collection|rev[0-9a-z]*)\b/g, ' ');

    // 10. Final strip - keep numbers but remove everything else
    const tokens = n.split(/\s+/).filter(t => t.length > 0);
    const stripped = tokens.join('').replace(/[^a-z0-9]/g, '');

    return stripped;
}

/**
 * Returns a "base" version of the name by taking everything before the first colon or major dash.
 */
export function getBaseName(name: string): string {
    // Split on major separators and "and" / "&" / "with" to find the main game name
    const parts = name.split(/[:\-]| \b(and|&|with)\b /i);
    return normalizeName(parts[0]);
}

/**
 * Returns a list of significant word tokens from a name.
 */
export function getTokens(name: string): string[] {
    if (!name) return [];
    let n = name.toLowerCase();

    // Expand abbreviations so they can match full names
    n = n.replace(/\btmnt\b/g, 'teenage mutant ninja turtles')
        .replace(/\bsf\b/g, 'street fighter')
        .replace(/\bkof\b/g, 'king of fighters')
        .replace(/\bmk\b/g, 'mortal kombat')
        .replace(/\bmslug\b/g, 'metal slug');

    const clean = n.replace(/[^a-z0-9 ]/g, ' ');
    return clean.split(/\s+/)
        .filter(t => t.length > 2) // Only words with 3+ characters are significant
        .filter(t => !['the', 'and', 'for', 'with', 'version', 'edition'].includes(t));
}

interface RomFileWithNormalized extends RomFile {
    normalizedName: string;
    normalizedBase: string;
    normalizedParent?: string;
    tokens: string[];
    parentTokens: string[];
    systemFolders: Set<string>;
}

export class RomMatcher {
    private fuse: Fuse<RomFile>;
    private roms: RomFile[];
    private normalizedRoms: RomFileWithNormalized[];
    private exactMatchMap: Map<string, RomFileWithNormalized[]>;
    private systemRomsMap: Map<string, RomFileWithNormalized[]>;
    private matchCache: Map<string, RomFile | null>;

    constructor(roms: RomFile[]) {
        this.roms = roms;
        this.matchCache = new Map();
        
        // Pre-compute all normalized data
        this.normalizedRoms = roms.map(rom => {
            const normalizedName = normalizeName(rom.name);
            const normalizedBase = getBaseName(rom.name);
            const normalizedParent = rom.parentDir ? normalizeName(rom.parentDir) : undefined;
            const tokens = getTokens(rom.name);
            const parentTokens = rom.parentDir ? getTokens(rom.parentDir) : [];
            
            // Extract system folders from path
            const pathParts = rom.path.toLowerCase().split('/');
            const systemFolders = new Set(pathParts);
            
            return {
                ...rom,
                normalizedName,
                normalizedBase,
                normalizedParent,
                tokens,
                parentTokens,
                systemFolders
            };
        });

        // Build exact match lookup map
        this.exactMatchMap = new Map();
        for (const rom of this.normalizedRoms) {
            const keys = [rom.normalizedName, rom.normalizedBase];
            if (rom.normalizedParent) {
                keys.push(rom.normalizedParent);
            }
            
            for (const key of keys) {
                if (!this.exactMatchMap.has(key)) {
                    this.exactMatchMap.set(key, []);
                }
                this.exactMatchMap.get(key)!.push(rom);
            }
        }

        // Build system-based lookup map
        this.systemRomsMap = new Map();
        const systemAliases: Record<string, string[]> = {
            'NES': ['nes', 'fc', 'famicom'],
            'SNES': ['snes', 'sfc', 'superfamicom'],
            'Genesis': ['genesis', 'md', 'megadrive', 'gen'],
            'GBA': ['gba'],
            'GB': ['gb', 'gameboy'],
            'GBC': ['gbc', 'gameboycolor'],
            'PS1': ['ps', 'ps1', 'psx'],
            'Arcade': ['arcade', 'fbneo', 'mame', 'cps1', 'cps2', 'cps3', 'neogeo', 'atomiswave', 'naomi'],
            'N64': ['n64'],
            'PORTS': ['ports']
        };

        for (const [system, aliases] of Object.entries(systemAliases)) {
            const systemRoms = this.normalizedRoms.filter(rom => 
                aliases.some(alias => rom.systemFolders.has(alias))
            );
            this.systemRomsMap.set(system, systemRoms);
        }

        this.fuse = new Fuse(roms, {
            keys: [
                { name: 'name', weight: 0.8 },
                { name: 'fullName', weight: 0.5 },
                { name: 'parentDir', weight: 0.3 }
            ],
            includeScore: true,
            threshold: 0.5,
        });
    }

    findMatch(targetName: string, systemContext?: string): RomFile | null {
        // Check cache first
        const cacheKey = `${targetName}|${systemContext || ''}`;
        if (this.matchCache.has(cacheKey)) {
            return this.matchCache.get(cacheKey)!;
        }

        const normalizedTarget = normalizeName(targetName);
        const baseTarget = getBaseName(targetName);
        const targetTokens = getTokens(targetName);

        // Map common muOS system folder aliases
        const systemAliases: Record<string, string[]> = {
            'NES': ['nes', 'fc', 'famicom'],
            'SNES': ['snes', 'sfc', 'superfamicom'],
            'Genesis': ['genesis', 'md', 'megadrive', 'gen'],
            'GBA': ['gba'],
            'GB': ['gb', 'gameboy'],
            'GBC': ['gbc', 'gameboycolor'],
            'PS1': ['ps', 'ps1', 'psx'],
            'Arcade': ['arcade', 'fbneo', 'mame', 'cps1', 'cps2', 'cps3', 'neogeo', 'atomiswave', 'naomi'],
            'N64': ['n64'],
            'PORTS': ['ports']
        };

        const currentAliases = systemContext ? (systemAliases[systemContext] || [systemContext.toLowerCase()]) : [];

        // 1. Try exact normalized match WITHIN the system folders (using pre-computed maps)
        let systemRoms: RomFileWithNormalized[] | undefined;
        if (systemContext) {
            systemRoms = this.systemRomsMap.get(systemContext);
        }

        if (systemRoms) {
            // For PORTS, check if the target is part of the path
            if (systemContext === 'PORTS') {
                const portsMatch = systemRoms.find(rom => {
                    const normalizedPath = normalizeName(rom.path);
                    return normalizedPath.includes(normalizedTarget);
                });
                if (portsMatch) {
                    this.matchCache.set(cacheKey, portsMatch);
                    return portsMatch;
                }
            }

            // Try exact matches using lookup map
            const exactMatches = this.exactMatchMap.get(normalizedTarget) || this.exactMatchMap.get(baseTarget) || [];
            const systemMatch = exactMatches.find(rom => 
                systemRoms!.includes(rom) &&
                (rom.normalizedName === normalizedTarget ||
                 rom.normalizedName === baseTarget ||
                 rom.normalizedParent === normalizedTarget ||
                 rom.normalizedParent === baseTarget)
            );
            if (systemMatch) {
                this.matchCache.set(cacheKey, systemMatch);
                return systemMatch;
            }
        }

        // 2. Fuzzy match WITHIN the system folders
        const results = this.fuse.search(targetName);
        if (results.length > 0 && systemRoms) {
            const commonWords = ['super', 'world', 'advance', 'bros', 'game', 'games', 'land', 'island', 'the', 'plus', 'adventure', 'adventures', 'allstars'];
            
            const bestInSystem = results.find(r => {
                const rom = this.normalizedRoms.find(nr => nr.path === r.item.path);
                if (!rom || !systemRoms!.includes(rom)) return false;

                // Threshold check
                if (r.score! >= 0.8) return false;

                // Borderline match validation: ensure at least one significant token matches
                if (r.score! > 0.4) {
                    const allRomTokens = [...rom.tokens, ...rom.parentTokens];
                    const hasSignificantOverlap = targetTokens.some(t =>
                        allRomTokens.includes(t) && !commonWords.includes(t)
                    );

                    if (!hasSignificantOverlap) return false;
                }

                return true;
            });
            if (bestInSystem) {
                this.matchCache.set(cacheKey, bestInSystem.item);
                return bestInSystem.item;
            }
        }

        // 3. Fallback: Try matching without system context if no match found (but with higher confidence)
        const globalBest = results.find(r => {
            if (r.score! >= 0.1) return false; // Higher confidence for global fallback

            const rom = this.normalizedRoms.find(nr => nr.path === r.item.path);
            if (!rom) return false;

            const allRomTokens = [...rom.tokens, ...rom.parentTokens];
            const commonWords = ['super', 'world', 'advance', 'bros', 'game', 'games', 'land', 'island', 'the', 'plus', 'adventure', 'adventures', 'allstars'];
            const hasSignificantOverlap = targetTokens.some(t =>
                allRomTokens.includes(t) && !commonWords.includes(t)
            );

            return hasSignificantOverlap;
        });
        if (globalBest) {
            this.matchCache.set(cacheKey, globalBest.item);
            return globalBest.item;
        }

        this.matchCache.set(cacheKey, null);
        return null;
    }
}
