import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { MuOSClient } from './utils/muos-client.js';
import { RomMatcher, RomFile } from './utils/matcher.js';
import { COLLECTIONS, Collection } from './data/recommendations.js';

const CACHE_FILE = path.join(process.cwd(), '.rom_cache.json');
const COLLECTION_CACHE_DIR = path.join(process.cwd(), 'collections_cache');
const COLLECTION_PATH = '/mnt/mmc/MUOS/info/collection'; // Standard SSH path for muOS collections

const MUOS_SYSTEM_IDS: Record<string, string> = {
    'GBA': 'GBA',
    'SNES': 'SNES',
    'NES': 'NES',
    'Genesis': 'MD',
    'PS1': 'PS',
    'GB': 'GB',
    'GBC': 'GBC',
    'Arcade': 'ARCADE'
};

function sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '-');
}

function cleanGameTitle(name: string): string {
    // Remove (USA), (Europe), [!], (En,Fr,De), etc.
    return name
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s*\[[^\]]*\]/g, '')
        .trim();
}

async function main() {
    console.log(chalk.cyan.bold('\n========================================'));
    console.log(chalk.cyan.bold('   muOS COLLECTION GENERATOR & DEPLOYER '));
    console.log(chalk.cyan.bold('========================================'));
    console.log(chalk.white(' This tool helps you create and deploy high-quality'));
    console.log(chalk.white(' game collections to your muOS-powered retro device.'));
    console.log(chalk.white(' Choose from curated essentials, franchises, and more.\n'));

    const connectionQuestions = [
        {
            type: 'input',
            name: 'ip',
            message: 'Enter your device IP:',
            default: '10.0.0.80',
        }
    ];

    const connectionAnswers = await inquirer.prompt(connectionQuestions);
    const client = new MuOSClient();

    try {
        console.log(chalk.yellow('\nConnecting to device...'));
        await client.connect({
            host: connectionAnswers.ip,
            username: 'root',
            password: 'root',
        });
        console.log(chalk.green('Connected!'));
    } catch (error: any) {
        console.error(chalk.red('\nFailed to connect to device:'), error.message);
        console.log(chalk.yellow('Please check your IP and ensure SSH is enabled on your muOS device.\n'));
        return;
    }

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
            when: (ans: any) => ans.confirmDeploy
        }
    ];

    const answers = {
        ...connectionAnswers,
        ...(await inquirer.prompt(preferenceQuestions))
    };

    try {
        let roms: string[] = [];
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
        const romFiles: RomFile[] = roms
            .filter(r => !path.basename(r).startsWith('._'))
            .map(r => {
                const fileName = path.basename(r);
                const ext = path.extname(fileName);
                return {
                    fullName: fileName,
                    name: fileName.replace(ext, ''),
                    path: r,
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

            let foundCount = 0;

            for (let i = 0; i < collection.games.length; i++) {
                const game = collection.games[i];
                const match = matcher.findMatch(game.name, game.system);

                // 1. Determine local game and display name
                const rawName = match ? match.name : game.name;
                const cleanName = cleanGameTitle(rawName);
                const orderPrefix = answers.useNumbers ? `${(i + 1).toString().padStart(2, '0')}. ` : '';

                const gameDisplayName = match ? `${orderPrefix}${cleanName}` : `${orderPrefix}[X] ${cleanName}`;

                // Use exact path if found, otherwise use a clear placeholder
                const romPath = match ? match.path : `/mnt/ROM_NOT_FOUND/${game.system}/${game.name}`;

                if (!match && answers.missingHandle === 'omit') continue;

                // 2. Create .cfg content: romPath \n systemID \n gameDisplayName
                const systemId = MUOS_SYSTEM_IDS[game.system] || game.system;
                const cfgContent = `${romPath}\n${systemId}\n${gameDisplayName}\n`;
                const safeFileName = sanitizeFilename(`${orderPrefix}${cleanName}`);
                const cfgFileName = `${safeFileName}.cfg`;

                try {
                    await fs.writeFile(path.join(collectionLocalPath, cfgFileName), cfgContent);
                } catch (writeErr: any) {
                    console.error(chalk.red(`  ! Failed to write local file: ${cfgFileName}`), writeErr.message);
                    throw writeErr;
                }

                if (match) foundCount++;
            }

            console.log(chalk.white(`- Generated '${collectionDirName}' (${foundCount}/${collection.games.length} matched)`));
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
                    } catch (uploadErr: any) {
                        console.error(chalk.red(`  ! Failed to upload ${cfg} to ${remotePath}:`), uploadErr.message);
                        throw uploadErr;
                    }
                }
            }
            console.log(chalk.green('Deployment complete!'));
        }

        console.log(chalk.cyan.bold('\nTask finished successfully! Enjoy your games.'));
        console.log(chalk.gray(`Collections are stored in: ${COLLECTION_CACHE_DIR}`));

    } catch (error: any) {
        console.error(chalk.red('\nAn error occurred:'), error.message);
    } finally {
        await client.disconnect();
    }
}

main();
