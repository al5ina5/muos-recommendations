import { ESSENTIALS } from './collections/essentials.js';
import { FRANCHISES } from './collections/franchises.js';
import { MOODS } from './collections/moods.js';
import { GENRES } from './collections/genres.js';
import { SPECIAL } from './collections/special.js';

export interface Recommendation {
    name: string;
    system: string;
    display?: string;  // Optional: override the display title
}

export interface Collection {
    id: string;
    title: string;
    description: string;
    category: 'Essentials' | 'Franchises' | 'Moods' | 'Genres' | 'Special';
    games: Recommendation[];
}

export const COLLECTIONS: Collection[] = [
    ...ESSENTIALS,
    ...FRANCHISES,
    ...MOODS,
    ...GENRES,
    ...SPECIAL
];
