import Fuse from 'fuse.js';
export function normalizeName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Remove special characters and spaces
        .replace(/\(.*?\)/g, '') // Remove text in parentheses
        .replace(/\[.*?\]/g, '') // Remove text in brackets
        .trim();
}
export class RomMatcher {
    fuse;
    roms;
    constructor(roms) {
        this.roms = roms;
        this.fuse = new Fuse(roms, {
            keys: ['name'],
            includeScore: true,
            threshold: 0.4, // Adjust as needed for sensitivity
        });
    }
    findMatch(targetName) {
        // 1. Precise match (normalized)
        const normalizedTarget = normalizeName(targetName);
        const exactMatch = this.roms.find(rom => normalizeName(rom.name) === normalizedTarget);
        if (exactMatch)
            return exactMatch;
        // 2. Fuzzy match
        const results = this.fuse.search(targetName);
        if (results.length > 0 && results[0] && typeof results[0].score === 'number' && results[0].score < 0.3) {
            return results[0].item;
        }
        return null;
    }
}
