#!/usr/bin/env node
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { MuOSClient } from './utils/muos-client.js';
import { RomMatcher } from './utils/matcher.js';
import { COLLECTIONS } from './data/recommendations.js';
const CACHE_FILE = path.join(process.cwd(), '.cache', 'cache.json');
const SETTINGS_FILE = path.join(process.cwd(), '.cache', 'settings.json');
const COLLECTION_CACHE_DIR = path.join(process.cwd(), '.cache', 'collections');
const COLLECTION_PATH = '/mnt/mmc/MUOS/info/collection'; // Standard SSH path for muOS collections
const MUOS_SYSTEM_IDS = {
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
function sanitizeFilename(name) {
    return name.replace(/[\\/:*?"<>|]/g, '-');
}
function cleanGameTitle(name) {
    // Remove (USA), (Europe), [!], (En,Fr,De), etc.
    return name
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s*\[[^\]]*\]/g, '')
        .replace(/_s\b/g, "'s") // Yoshi_s -> Yoshi's
        .replace(/_t\b/g, "'t") // Don_t -> Don't
        .replace(/_n\b/g, "'n") // Rock_n -> Rock'n
        .replace(/_ll\b/g, "'ll") // You_ll -> You'll
        .replace(/_re\b/g, "'re") // They_re -> They're
        .replace(/_ve\b/g, "'ve") // I_ve -> I've
        .replace(/_d\b/g, "'d") // I_d -> I'd
        .trim();
}
function displaySettings(settings) {
    console.log(chalk.cyan.bold('\n--- Pre-configured Settings ---'));
    console.log(chalk.white(`  Device IP: ${chalk.yellow(settings.ip)}`));
    console.log(chalk.white(`  ROMs Path: ${chalk.yellow(settings.romPath)}`));
    console.log(chalk.white(`  Use ROM Cache: ${chalk.yellow(settings.useCache ? 'Yes' : 'No')}`));
    console.log(chalk.white(`  Categories: ${chalk.yellow(settings.categories.join(', '))}`));
    console.log(chalk.white(`  Missing ROMs: ${chalk.yellow(settings.missingHandle === 'mark' ? 'Mark with [X]' : 'Omit')}`));
    console.log(chalk.white(`  Display Numbers: ${chalk.yellow(settings.useNumbers ? 'Yes' : 'No')}`));
    console.log(chalk.white(`  Auto Deploy: ${chalk.yellow(settings.confirmDeploy ? 'Yes' : 'No')}`));
    if (settings.confirmDeploy) {
        console.log(chalk.white(`  Clear Existing: ${chalk.yellow(settings.clearExisting ? 'Yes' : 'No')}`));
    }
    console.log(chalk.cyan.bold('--------------------------------\n'));
}
async function promptForSettings() {
    const connectionQuestions = [
        {
            type: 'input',
            name: 'ip',
            message: 'Enter your device IP:',
            default: '10.0.0.80',
        }
    ];
    const connectionAnswers = await inquirer.prompt(connectionQuestions);
    const hasCache = fs.existsSync(CACHE_FILE);
    const preferenceQuestions = [
        {
            type: 'input',
            name: 'romPath',
            message: 'Enter your ROMs folder path on device:',
            default: '/mnt/sdcard/ROMS',
        },
        {
            type: 'confirm',
            name: 'useCache',
            message: 'Found a cached ROM list. Use it?',
            default: true,
            when: () => hasCache
        },
        {
            type: 'checkbox',
            name: 'categories',
            message: 'What kind of collections do you want created?',
            choices: [
                { name: 'Essentials (Top 50 lists)', value: 'Essentials', checked: true },
                { name: 'Franchise Collections (Zelda, Mario, etc.)', value: 'Franchises', checked: true },
                { name: 'Hardware & Ports (PICO-8, Native Engine, etc.)', value: 'Special', checked: true },
                { name: 'Mood & Vibe based (Cozy, Cinematic, etc.)', value: 'Moods', checked: false },
                { name: 'Genre Specials (RPGs, Platformers, etc.)', value: 'Genres', checked: false },
            ]
        },
        {
            type: 'list',
            name: 'missingHandle',
            message: 'How should unfound roms be handled?',
            choices: [
                { name: 'Mark with [X] (DEFAULT)', value: 'mark' },
                { name: 'Omit from list', value: 'omit' },
            ],
            default: 'mark',
        },
        {
            type: 'confirm',
            name: 'useNumbers',
            message: 'Display with numbers?',
            default: true,
        },
        {
            type: 'confirm',
            name: 'confirmDeploy',
            message: 'Deploy to device automatically after generation?',
            default: true,
        },
        {
            type: 'confirm',
            name: 'clearExisting',
            message: 'Clear existing collections on device first?',
            default: false,
            when: (ans) => ans.confirmDeploy
        }
    ];
    const preferences = await inquirer.prompt(preferenceQuestions);
    // Ensure useCache has a default value if not prompted
    const useCache = preferences.useCache !== undefined ? preferences.useCache : false;
    return {
        ...connectionAnswers,
        ...preferences,
        useCache
    };
}
async function main() {
    console.log(chalk.cyan.bold('\n========================================'));
    console.log(chalk.cyan.bold('   muOS COLLECTION GENERATOR & DEPLOYER '));
    console.log(chalk.cyan.bold('========================================'));
    console.log(chalk.white(' This tool helps you create and deploy high-quality'));
    console.log(chalk.white(' game collections to your muOS-powered retro device.'));
    console.log(chalk.white(' Choose from curated essentials, franchises, and more.\n'));
    let answers;
    const hasSettingsCache = fs.existsSync(SETTINGS_FILE);
    // Check if settings cache exists and ask if user wants to use it
    if (hasSettingsCache) {
        const useCachedSettings = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'runLikeBefore',
                message: 'Use saved settings?',
                default: true,
            }
        ]);
        if (useCachedSettings.runLikeBefore) {
            const cachedSettings = fs.readJsonSync(SETTINGS_FILE);
            // Re-evaluate useCache based on whether ROM cache file exists
            const hasRomCache = fs.existsSync(CACHE_FILE);
            cachedSettings.useCache = cachedSettings.useCache && hasRomCache;
            displaySettings(cachedSettings);
            answers = cachedSettings;
        }
        else {
            // User wants to configure new settings
            answers = await promptForSettings();
            // Save new settings
            fs.writeJsonSync(SETTINGS_FILE, answers);
        }
    }
    else {
        // First run - no settings cache
        answers = await promptForSettings();
        // Save settings for next time
        fs.writeJsonSync(SETTINGS_FILE, answers);
    }
    const client = new MuOSClient();
    try {
        console.log(chalk.yellow('\nConnecting to device...'));
        await client.connect({
            host: answers.ip,
            username: 'root',
            password: 'root',
        });
        console.log(chalk.green('Connected!'));
    }
    catch (error) {
        console.error(chalk.red('\nFailed to connect to device:'), error.message);
        console.log(chalk.yellow('Please check your IP and ensure SSH is enabled on your muOS device.\n'));
        return;
    }
    try {
        let roms = [];
        if (answers.useCache) {
            console.log(chalk.yellow('Using cached ROM list...'));
            roms = fs.readJsonSync(CACHE_FILE);
        }
        if (roms.length === 0) {
            console.log(chalk.yellow('Fetching ROM list from device (this may take a minute)...'));
            roms = await client.listRomsRecursively(answers.romPath);
            fs.writeJsonSync(CACHE_FILE, roms);
            console.log(chalk.green(`Fetched ${roms.length} ROMs and cached them.`));
        }
        // Process ROMs for the matcher
        const romFiles = roms
            .filter(r => {
            // Filter out macOS metadata files
            if (path.basename(r).startsWith('._'))
                return false;
            const fileName = path.basename(r);
            const ext = path.extname(fileName).toLowerCase();
            const lowerPath = r.toLowerCase();
            // Filter out image files that are not PICO-8 games
            // PICO-8 uses .p8.png extension, so regular .png files should be excluded
            if (ext === '.png' && !fileName.toLowerCase().endsWith('.p8.png')) {
                return false;
            }
            // Filter out files in Imgs/Images/Artwork folders (image directories)
            const pathParts = lowerPath.split('/');
            if (pathParts.some(part => part === 'imgs' || part === 'images' || part === 'artwork' || part === 'covers')) {
                return false;
            }
            return true;
        })
            .map(r => {
            const fileName = path.basename(r);
            const ext = path.extname(fileName);
            const parts = r.split('/');
            const parentDir = parts.length > 1 ? parts[parts.length - 2] : undefined;
            return {
                fullName: fileName,
                name: fileName.replace(ext, ''),
                path: r,
                parentDir
            };
        });
        const matcher = new RomMatcher(romFiles);
        console.log(chalk.yellow('\nGenerating collections...'));
        await fs.emptyDir(COLLECTION_CACHE_DIR);
        const selectedCollections = COLLECTIONS.filter(c => answers.categories.includes(c.category));
        for (const collection of selectedCollections) {
            const collectionDirName = sanitizeFilename(collection.title);
            const collectionLocalPath = path.join(COLLECTION_CACHE_DIR, collectionDirName);
            await fs.ensureDir(collectionLocalPath);
            // Process all games in parallel for matching
            const gameMatches = await Promise.all(collection.games.map(async (game, i) => {
                const match = matcher.findMatch(game.name, game.system);
                return { game, match, index: i };
            }));
            // Prepare all file writes in parallel
            const writePromises = [];
            let foundCount = 0;
            for (const { game, match, index: i } of gameMatches) {
                // 1. Determine display name
                // Priority: explicit display override > collection name > cleaned ROM filename
                const cleanName = game.display || game.name;
                const orderPrefix = answers.useNumbers ? `${(i + 1).toString().padStart(2, '0')}. ` : '';
                const gameDisplayName = match ? `${orderPrefix}${cleanName}` : `${orderPrefix}[X] ${cleanName}`;
                // Use exact path if found, otherwise use a clear placeholder
                const romPath = match ? match.path : `/mnt/ROM_NOT_FOUND/${game.system}/${game.name}`;
                if (!match && answers.missingHandle === 'omit')
                    continue;
                // 2. Create .cfg content: romPath \n systemID \n gameDisplayName
                const systemId = MUOS_SYSTEM_IDS[game.system] || game.system;
                const cfgContent = `${romPath}\n${systemId}\n${gameDisplayName}\n`;
                const safeFileName = sanitizeFilename(`${orderPrefix}${cleanName}`);
                const cfgFileName = `${safeFileName}.cfg`;
                // Queue file write (will execute in parallel)
                writePromises.push(fs.writeFile(path.join(collectionLocalPath, cfgFileName), cfgContent)
                    .catch((writeErr) => {
                    console.error(chalk.red(`  ! Failed to write local file: ${cfgFileName}`), writeErr.message);
                    throw writeErr;
                }));
                if (match)
                    foundCount++;
            }
            // Execute all file writes in parallel
            await Promise.all(writePromises);
            const percentage = ((foundCount / collection.games.length) * 100).toFixed(1);
            console.log(chalk.white(`- Generated '${collectionDirName}' (${foundCount}/${collection.games.length} matched, ${percentage}%)`));
        }
        if (answers.confirmDeploy) {
            console.log(chalk.yellow('\nDeploying to device...'));
            const remoteBaseDir = COLLECTION_PATH;
            if (answers.clearExisting) {
                console.log(chalk.red('  Clearing existing collections...'));
                await client.execCommand(`rm -rf "${remoteBaseDir}"/*`);
            }
            const collectionFolders = await fs.readdir(COLLECTION_CACHE_DIR);
            for (const folder of collectionFolders) {
                const localFolder = path.join(COLLECTION_CACHE_DIR, folder);
                const remoteFolder = path.join(remoteBaseDir, folder);
                console.log(chalk.white(`  Deploying ${folder}...`));
                await client.execCommand(`mkdir -p "${remoteFolder}"`);
                const cfgs = await fs.readdir(localFolder);
                for (const cfg of cfgs) {
                    const localPath = path.join(localFolder, cfg);
                    const remotePath = path.join(remoteFolder, cfg);
                    try {
                        await client.uploadFile(localPath, remotePath);
                    }
                    catch (uploadErr) {
                        console.error(chalk.red(`  ! Failed to upload ${cfg} to ${remotePath}:`), uploadErr.message);
                        throw uploadErr;
                    }
                }
            }
            console.log(chalk.green('Deployment complete!'));
        }
        console.log(chalk.cyan.bold('\nTask finished successfully! Enjoy your games.'));
        console.log(chalk.gray(`Collections are stored in: ${COLLECTION_CACHE_DIR}`));
    }
    catch (error) {
        console.error(chalk.red('\nAn error occurred:'), error.message);
    }
    finally {
        await client.disconnect();
    }
}
main();
