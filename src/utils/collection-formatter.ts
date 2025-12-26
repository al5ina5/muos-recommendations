import { Recommendation } from '../data/recommendations.js';
import { RomFile } from './matcher.js';

export interface FormatGameOptions {
    useNumbers: boolean;
    index: number;
    missingHandle: 'mark' | 'omit';
}

export interface ICollectionFormatter {
    formatGame(game: Recommendation, match: RomFile | null, options: FormatGameOptions, relativePath?: string): string;
    getFileExtension(): string;
    getCollectionPath(basePath: string, collectionTitle: string, system?: string): string;
    getSystemId(system: string): string;
}

