import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { MuOSClient } from './utils/muos-client.js';
import { RomMatcher } from './utils/matcher.js';
import { TOP_GAMES } from './data/top-50-data.js';
const CACHE_FILE = path.join(process.cwd(), '.rom_cache.json');
const COLLECTION_PATH = '/mnt/mmc/MUOS/info/collection'; // Standard SSH path for muOS collections
function sanitizeFilename(name) {
    return name.replace(/[\\/:*?"<>|]/g, '-');
}
function cleanGameTitle(name) {
    // Remove (USA), (Europe), [!], (En,Fr,De), etc.
    return name
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/\s*\[[^\]]*\]/g, '')
        .trim();
}
async function main() {
    console.log(chalk.cyan.bold('\n========================================'));
    console.log(chalk.cyan.bold('   muOS COLLECTION GENERATOR & DEPLOYER '));
    console.log(chalk.cyan.bold('========================================\n'));
    const questions = [
        {
            type: 'input',
            name: 'ip',
            message: 'Enter your device IP:',
            default: '10.0.0.80',
        },
        {
            type: 'input',
            name: 'romPath',
            message: 'Enter your ROMs folder path on device:',
            default: '/mnt/sdcard/ROMS',
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
        }
    ];
    const answers = await inquirer.prompt(questions);
    const client = new MuOSClient();
    try {
        console.log(chalk.yellow('\nConnecting to device...'));
        await client.connect({
            host: answers.ip,
            username: 'root',
            password: 'root',
        });
        console.log(chalk.green('Connected!'));
        let roms = [];
        if (fs.existsSync(CACHE_FILE)) {
            const useCache = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'useCache',
                    message: 'Found a cached ROM list. Use it?',
                    default: true,
                }
            ]);
            if (useCache.useCache) {
                console.log(chalk.yellow('Using cached ROM list...'));
                roms = fs.readJsonSync(CACHE_FILE);
            }
        }
        if (roms.length === 0) {
            console.log(chalk.yellow('Fetching ROM list from device (this may take a minute)...'));
            roms = await client.listRomsRecursively(answers.romPath);
            fs.writeJsonSync(CACHE_FILE, roms);
            console.log(chalk.green(`Fetched ${roms.length} ROMs and cached them.`));
        }
        // Process ROMs for the matcher
        const romFiles = roms.map(r => {
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
        const tempOutputDir = path.join(process.cwd(), 'temp_collections');
        await fs.ensureDir(tempOutputDir);
        for (const [system, games] of Object.entries(TOP_GAMES)) {
            const collectionDirName = `${system} - Top 50 Essentials`;
            const collectionLocalPath = path.join(tempOutputDir, collectionDirName);
            await fs.ensureDir(collectionLocalPath);
            let foundCount = 0;
            for (let i = 0; i < games.length; i++) {
                const game = games[i];
                const match = matcher.findMatch(game);
                // 1. Determine local game and display name
                const rawName = match ? match.name : game;
                const cleanName = cleanGameTitle(rawName);
                const orderPrefix = (i + 1).toString().padStart(2, '0');
                const gameDisplayName = match ? `${orderPrefix}. ${cleanName}` : `${orderPrefix}. [X] ${cleanName}`;
                const romPath = match ? match.path : `/mnt/union/ROMS/${system}/${game}.gba`;
                if (!match && answers.missingHandle === 'omit')
                    continue;
                // 2. Create .cfg content: romPath \n systemID \n gameDisplayName
                const cfgContent = `${romPath}\n${system}\n${gameDisplayName}\n`;
                const safeFileName = sanitizeFilename(`${orderPrefix}. ${cleanName}`);
                const cfgFileName = `${safeFileName}.cfg`;
                try {
                    await fs.writeFile(path.join(collectionLocalPath, cfgFileName), cfgContent);
                }
                catch (writeErr) {
                    console.error(chalk.red(`  ! Failed to write local file: ${cfgFileName}`), writeErr.message);
                    throw writeErr;
                }
                if (match)
                    foundCount++;
            }
            console.log(chalk.white(`- Generated '${collectionDirName}' (${foundCount}/50 matched)`));
        }
        const deploy = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmDeploy',
                message: 'Collections generated locally. Deploy to device now?',
                default: true,
            }
        ]);
        if (deploy.confirmDeploy) {
            console.log(chalk.yellow('Deploying to device...'));
            const remoteBaseDir = COLLECTION_PATH;
            const collectionFolders = await fs.readdir(tempOutputDir);
            for (const folder of collectionFolders) {
                const localFolder = path.join(tempOutputDir, folder);
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
    }
    catch (error) {
        console.error(chalk.red('\nAn error occurred:'), error.message);
    }
    finally {
        await client.disconnect();
        // Cleanup temporary files
        await fs.remove(path.join(process.cwd(), 'temp_collections'));
    }
}
main();
