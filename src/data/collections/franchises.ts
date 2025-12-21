import { Collection } from '../recommendations.js';

export const FRANCHISES: Collection[] = [
    {
        id: 'franchise-zelda',
        title: 'The Legend of Zelda',
        description: 'Every classic adventure through Hyrule.',
        category: 'Franchises',
        games: [
            { name: "The Legend of Zelda", system: "NES" },
            { name: "Zelda II: The Adventure of Link", system: "NES" },
            { name: "The Legend of Zelda: A Link to the Past", system: "SNES" },
            { name: "The Legend of Zelda: Link's Awakening", system: "GB" },
            { name: "The Legend of Zelda: Link's Awakening DX", system: "GBC" },
            { name: "The Legend of Zelda: Oracle of Ages", system: "GBC" },
            { name: "The Legend of Zelda: Oracle of Seasons", system: "GBC" },
            { name: "The Legend of Zelda: The Minish Cap", system: "GBA" },
            { name: "The Legend of Zelda: A Link to the Past & Four Swords", system: "GBA" }
        ]
    },
    {
        id: 'franchise-mario',
        title: 'Super Mario Bros.',
        description: 'The evolution of the platforming king.',
        category: 'Franchises',
        games: [
            { name: "Super Mario Bros.", system: "NES" },
            { name: "Super Mario Bros. 2", system: "NES" },
            { name: "Super Mario Bros. 3", system: "NES" },
            { name: "Super Mario World", system: "SNES" },
            { name: "Super Mario World 2: Yoshi's Island", system: "SNES" },
            { name: "Super Mario Land", system: "GB" },
            { name: "Super Mario Land 2: 6 Golden Coins", system: "GB" },
            { name: "Super Mario Advance", system: "GBA" },
            { name: "Super Mario World: Super Mario Advance 2", system: "GBA" },
            { name: "Yoshi's Island: Super Mario Advance 3", system: "GBA" },
            { name: "Super Mario Advance 4: Super Mario Bros. 3", system: "GBA" },
            { name: "Super Mario RPG: Legend of the Seven Stars", system: "SNES" },
            { name: "Mario & Luigi: Superstar Saga", system: "GBA" }
        ]
    },
    {
        id: 'franchise-metroid',
        title: 'Metroid',
        description: 'Intergalactic bounty hunting at its best.',
        category: 'Franchises',
        games: [
            { name: "Metroid", system: "NES" },
            { name: "Metroid II: Return of Samus", system: "GB" },
            { name: "Super Metroid", system: "SNES" },
            { name: "Metroid Fusion", system: "GBA" },
            { name: "Metroid: Zero Mission", system: "GBA" }
        ]
    },
    {
        id: 'franchise-mega-man',
        title: 'Mega Man / Rockman',
        description: 'The Blue Bomber\'s toughest battles.',
        category: 'Franchises',
        games: [
            { name: "Mega Man", system: "NES" },
            { name: "Mega Man 2", system: "NES" },
            { name: "Mega Man 3", system: "NES" },
            { name: "Mega Man 4", system: "NES" },
            { name: "Mega Man 5", system: "NES" },
            { name: "Mega Man 6", system: "NES" },
            { name: "Mega Man 7", system: "SNES" },
            { name: "Mega Man X", system: "SNES" },
            { name: "Mega Man X2", system: "SNES" },
            { name: "Mega Man X3", system: "SNES" },
            { name: "Mega Man X4", system: "PS1" },
            { name: "Mega Man X5", system: "PS1" },
            { name: "Mega Man X6", system: "PS1" },
            { name: "Mega Man Zero", system: "GBA" },
            { name: "Mega Man Zero 2", system: "GBA" },
            { name: "Mega Man Zero 3", system: "GBA" },
            { name: "Mega Man Zero 4", system: "GBA" },
            { name: "Mega Man Battle Network", system: "GBA" },
            { name: "Mega Man Battle Network 2", system: "GBA" },
            { name: "Mega Man Battle Network 3", system: "GBA" }
        ]
    },
    {
        id: 'franchise-castlevania',
        title: 'Castlevania',
        description: "Vampire hunting through the centuries.",
        category: 'Franchises',
        games: [
            { name: "Castlevania", system: "NES" },
            { name: "Castlevania II: Simon's Quest", system: "NES" },
            { name: "Castlevania III: Dracula's Curse", system: "NES" },
            { name: "Super Castlevania IV", system: "SNES" },
            { name: "Castlevania: Dracula X", system: "SNES" },
            { name: "Castlevania: Bloodlines", system: "Genesis" },
            { name: "Castlevania: Symphony of the Night", system: "PS1" },
            { name: "Castlevania: Circle of the Moon", system: "GBA" },
            { name: "Castlevania: Harmony of Dissonance", system: "GBA" },
            { name: "Castlevania: Aria of Sorrow", system: "GBA" },
            { name: "Castlevania II: Belmont's Revenge", system: "GB" }
        ]
    },
    {
        id: 'franchise-pokemon',
        title: 'Pokémon',
        description: "Gotta catch 'em all across the classic regions.",
        category: 'Franchises',
        games: [
            { name: "Pokémon Red", system: "GB" },
            { name: "Pokémon Blue", system: "GB" },
            { name: "Pokémon Yellow", system: "GB" },
            { name: "Pokémon Gold", system: "GBC" },
            { name: "Pokémon Silver", system: "GBC" },
            { name: "Pokémon Crystal", system: "GBC" },
            { name: "Pokémon Ruby", system: "GBA" },
            { name: "Pokémon Sapphire", system: "GBA" },
            { name: "Pokémon Emerald", system: "GBA" },
            { name: "Pokémon FireRed", system: "GBA" },
            { name: "Pokémon LeafGreen", system: "GBA" },
            { name: "Pokémon Pinball", system: "GBC" },
            { name: "Pokémon Pinball: Ruby & Sapphire", system: "GBA" },
            { name: "Pokémon Trading Card Game", system: "GBC" }
        ]
    },
    {
        id: 'franchise-final-fantasy',
        title: 'Final Fantasy',
        description: "Grand RPG adventures from the 8 to 32-bit eras.",
        category: 'Franchises',
        games: [
            { name: "Final Fantasy", system: "NES" },
            { name: "Final Fantasy II", system: "SNES" },
            { name: "Final Fantasy III", system: "SNES" },
            { name: "Final Fantasy IV Advance", system: "GBA" },
            { name: "Final Fantasy V Advance", system: "GBA" },
            { name: "Final Fantasy VI Advance", system: "GBA" },
            { name: "Final Fantasy VII", system: "PS1" },
            { name: "Final Fantasy VIII", system: "PS1" },
            { name: "Final Fantasy IX", system: "PS1" },
            { name: "Final Fantasy Tactics Advance", system: "GBA" },
            { name: "Final Fantasy Tactics", system: "PS1" }
        ]
    },
    {
        id: 'franchise-sonic',
        title: 'Sonic the Hedgehog',
        description: "The fastest thing alive's retro catalog.",
        category: 'Franchises',
        games: [
            { name: "Sonic the Hedgehog", system: "Genesis" },
            { name: "Sonic the Hedgehog 2", system: "Genesis" },
            { name: "Sonic the Hedgehog 3", system: "Genesis" },
            { name: "Sonic & Knuckles", system: "Genesis" },
            { name: "Sonic CD", system: "Genesis" },
            { name: "Sonic Advance", system: "GBA" },
            { name: "Sonic Advance 2", system: "GBA" },
            { name: "Sonic Advance 3", system: "GBA" },
            { name: "Sonic Battle", system: "GBA" }
        ]
    },
    {
        id: 'franchise-kirby',
        title: 'Kirby',
        description: "Nintendo's pink puffball and his many copy abilities.",
        category: 'Franchises',
        games: [
            { name: "Kirby's Dream Land", system: "GB" },
            { name: "Kirby's Dream Land 2", system: "GB" },
            { name: "Kirby's Adventure", system: "NES" },
            { name: "Kirby Super Star", system: "SNES" },
            { name: "Kirby's Dream Land 3", system: "SNES" },
            { name: "Kirby: Nightmare in Dream Land", system: "GBA" },
            { name: "Kirby & the Amazing Mirror", system: "GBA" },
            { name: "Kirby's Dream Course", system: "SNES" }
        ]
    }
];
