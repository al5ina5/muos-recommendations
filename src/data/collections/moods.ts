import { Collection } from '../recommendations.js';

export const MOODS: Collection[] = [
    {
        id: 'mood-cozy',
        title: 'Cozy & Relaxing',
        description: 'Perfect for a rainy day or a slow afternoon.',
        category: 'Moods',
        games: [
            { name: "Harvest Moon: Friends of Mineral Town", system: "GBA" },
            { name: "Animal Crossing", system: "N64" },
            { name: "Stardew Valley", system: "PORTS" },
            { name: "The Legend of Zelda: The Minish Cap", system: "GBA" },
            { name: "Kirby's Epic Yarn", system: "PORTS" },
            { name: "Yoshi's Island", system: "SNES" },
            { name: "Pokémon Gold", system: "GBC" },
            { name: "Harvest Moon", system: "SNES" },
            { name: "Tetris", system: "GB" },
            { name: "Kirby's Dream Course", system: "SNES" },
            { name: "Mario's Picross", system: "GB" },
            { name: "Survival Kids", system: "GBC" },
            { name: "Hamtaro: Ham-Ham Heartbreak", system: "GBA" },
            { name: "SimCity", system: "SNES" },
            { name: "Pilotwings", system: "SNES" }
        ]
    },
    {
        id: 'mood-horror',
        title: 'Spooky & Survival Horror',
        description: 'Games that will keep you on the edge of your seat.',
        category: 'Moods',
        games: [
            { name: "Resident Evil", system: "PS1" },
            { name: "Resident Evil 2", system: "PS1" },
            { name: "Resident Evil 3: Nemesis", system: "PS1" },
            { name: "Silent Hill", system: "PS1" },
            { name: "Castlevania: Aria of Sorrow", system: "GBA" },
            { name: "Metroid Fusion", system: "GBA" },
            { name: "Splatterhouse", system: "Arcade" },
            { name: "Splatterhouse 2", system: "Genesis" },
            { name: "Splatterhouse 3", system: "Genesis" },
            { name: "Dino Crisis", system: "PS1" },
            { name: "Dino Crisis 2", system: "PS1" },
            { name: "Parasite Eve", system: "PS1" },
            { name: "Clock Tower", system: "SNES" },
            { name: "Sweet Home", system: "NES" },
            { name: "Alone in the Dark: The New Nightmare", system: "PS1" },
            { name: "Koudelka", system: "PS1" },
            { name: "Vampire Hunter D", system: "PS1" },
            { name: "Nightmare Creatures", system: "PS1" }
        ]
    },
    {
        id: 'mood-hardcore',
        title: 'Hardcore & Brutal',
        description: 'For those who seek a true challenge.',
        category: 'Moods',
        games: [
            { name: "Contra: Hard Corps", system: "Genesis" },
            { name: "Super Ghouls 'n Ghosts", system: "SNES" },
            { name: "Ninja Gaiden", system: "NES" },
            { name: "Ghosts 'n Goblins", system: "NES" },
            { name: "Mega Man & Bass", system: "GBA" },
            { name: "Battletoads", system: "NES" },
            { name: "Ikaruga", system: "DREAMCAST" },
            { name: "Metal Slug 3", system: "Arcade" },
            { name: "Strikers 1945 II", system: "Arcade" },
            { name: "Gradius III", system: "SNES" },
            { name: "R-Type", system: "Arcade" },
            { name: "Castlevania III: Dracula's Curse", system: "NES" },
            { name: "Alien Soldier", system: "Genesis" },
            { name: "Musha", system: "Genesis" },
            { name: "Hagane: The Final Conflict", system: "SNES" }
        ]
    },
    {
        id: 'mood-cinematic',
        title: 'Cinematic Masterpieces',
        description: 'Story-driven experiences that push the hardware.',
        category: 'Moods',
        games: [
            { name: "Metal Gear Solid", system: "PS1" },
            { name: "Final Fantasy VII", system: "PS1" },
            { name: "Chrono Trigger", system: "SNES" },
            { name: "Vagrant Story", system: "PS1" },
            { name: "Castlevania: Symphony of the Night", system: "PS1" },
            { name: "Golden Sun", system: "GBA" },
            { name: "Panzer Dragoon Saga", system: "SATURN" },
            { name: "Xenogears", system: "PS1" },
            { name: "Legacy of Kain: Soul Reaver", system: "PS1" },
            { name: "Abe's Oddysee", system: "PS1" },
            { name: "Mother 3", system: "GBA" },
            { name: "The Legend of Dragoon", system: "PS1" },
            { name: "Lunar: Silver Star Story Complete", system: "PS1" },
            { name: "Grandia", system: "PS1" }
        ]
    }
];
