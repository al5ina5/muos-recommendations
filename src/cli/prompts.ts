import inquirer from 'inquirer';
import fs from 'fs-extra';
import chalk from 'chalk';
import { Settings } from '../types.js';
import { CACHE_FILE, SETTINGS_FILE } from '../constants.js';

export async function promptForSettings(): Promise<Settings> {
    // First, ask for connection mode
    const connectionModeAnswer = await inquirer.prompt([
        {
            type: 'list',
            name: 'connectionMode',
            message: 'How do you want to access your device?',
            choices: [
                { name: 'SSH (remote device on network)', value: 'ssh' },
                { name: 'Local Folder (SD card mounted or local folder)', value: 'local' }
            ],
            default: 'ssh'
        }
    ]);

    // Ask for OS type
    const osTypeAnswer = await inquirer.prompt([
        {
            type: 'list',
            name: 'osType',
            message: 'Which OS is your device running?',
            choices: [
                { name: 'muOS', value: 'muos' },
                { name: 'SpruceOS (Miyoo Flip)', value: 'spruceos' }
            ],
            default: 'muos'
        }
    ]);

    // Connection-specific questions
    let connectionDetails: any = {};
    if (connectionModeAnswer.connectionMode === 'ssh') {
        const sshAnswers = await inquirer.prompt([
            {
                type: 'input',
                name: 'ip',
                message: 'Enter your device IP:',
                default: osTypeAnswer.osType === 'spruceos' ? '10.0.0.93' : '10.0.0.80',
                validate: (input: string) => {
                    if (!input.trim()) {
                        return 'IP address is required';
                    }
                    return true;
                }
            }
        ]);
        connectionDetails = sshAnswers;
    } else {
        const localAnswers = await inquirer.prompt([
            {
                type: 'input',
                name: 'localPath',
                message: 'Enter the path to your local folder (SD card mount point or local folder):',
                validate: (input: string) => {
                    if (!input.trim()) {
                        return 'Local folder path is required';
                    }
                    if (!fs.existsSync(input)) {
                        return `Path does not exist: ${input}`;
                    }
                    return true;
                }
            }
        ]);
        connectionDetails = localAnswers;
    }

    // Determine default paths based on OS
    let defaultRomPath: string;
    let defaultRomPaths: string[] | undefined;
    let defaultCollectionPath: string;

    if (osTypeAnswer.osType === 'spruceos') {
        // SpruceOS supports multiple ROM paths
        defaultRomPaths = connectionModeAnswer.connectionMode === 'ssh'
            ? ['/mnt/sdcard/Roms', '/media/sdcard1/Roms']
            : ['Roms'];
        defaultRomPath = defaultRomPaths[0]; // Keep for backward compatibility
        defaultCollectionPath = connectionModeAnswer.connectionMode === 'ssh'
            ? '/mnt/sdcard/Collections'
            : 'Collections';
    } else {
        // muOS uses single path
        defaultRomPath = connectionModeAnswer.connectionMode === 'ssh'
            ? '/mnt/sdcard/ROMS'
            : 'ROMS';
        defaultCollectionPath = connectionModeAnswer.connectionMode === 'ssh'
            ? '/mnt/mmc/MUOS/info/collection'
            : 'MUOS/info/collection';
    }

    const pathQuestions: any[] = [];

    if (osTypeAnswer.osType === 'spruceos') {
        // SpruceOS: Ask for multiple ROM paths (don't ask for single romPath)
        pathQuestions.push({
            type: 'input',
            name: 'romPaths',
            message: connectionModeAnswer.connectionMode === 'ssh'
                ? 'Enter ROM paths (comma-separated, e.g., /mnt/sdcard/Roms,/media/sdcard1/Roms):'
                : 'Enter ROM paths (comma-separated, relative to local folder root):',
            default: defaultRomPaths!.join(','),
            filter: (input: string) => {
                // Split by comma and trim each path
                return input.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
            }
        });
        // Set romPath to first path for backward compatibility (but don't prompt for it)
        defaultRomPath = defaultRomPaths![0];
    } else {
        // muOS: Single ROM path
        pathQuestions.push({
            type: 'input',
            name: 'romPath',
            message: connectionModeAnswer.connectionMode === 'ssh'
                ? 'Enter your ROMs folder path on device:'
                : 'Enter your ROMs folder path (relative to local folder root):',
            default: defaultRomPath
        });
    }

    pathQuestions.push({
        type: 'input',
        name: 'collectionPath',
        message: connectionModeAnswer.connectionMode === 'ssh'
            ? 'Enter collection output path on device:'
            : 'Enter collection output path (relative to local folder root):',
        default: defaultCollectionPath
    });

    const pathAnswers = await inquirer.prompt(pathQuestions);

    // Ensure romPath exists for backward compatibility
    if (osTypeAnswer.osType === 'spruceos' && pathAnswers.romPaths) {
        pathAnswers.romPath = pathAnswers.romPaths[0]; // Use first path as primary
    }

    const hasCache = fs.existsSync(CACHE_FILE);
    let cacheInfo: { age?: string; romCount?: number } = {};

    if (hasCache) {
        try {
            const cacheStat = fs.statSync(CACHE_FILE);
            const cacheAge = Date.now() - cacheStat.mtime.getTime();
            const days = Math.floor(cacheAge / (1000 * 60 * 60 * 24));
            const hours = Math.floor((cacheAge % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            let ageText = '';
            if (days > 0) {
                ageText = `${days} day${days > 1 ? 's' : ''}`;
                if (hours > 0) ageText += ` ${hours} hour${hours > 1 ? 's' : ''}`;
            } else if (hours > 0) {
                ageText = `${hours} hour${hours > 1 ? 's' : ''}`;
            } else {
                ageText = 'less than an hour';
            }

            const cachedRoms = fs.readJsonSync(CACHE_FILE) as string[];
            cacheInfo = { age: ageText, romCount: cachedRoms.length };
        } catch (e) {
            // Ignore errors reading cache info
        }
    }

    const preferenceQuestions = [
        {
            type: 'confirm',
            name: 'useCache',
            message: hasCache && cacheInfo.age
                ? `Found cached ROM list (${cacheInfo.romCount || 'unknown'} ROMs, ${cacheInfo.age} old). Use it?`
                : 'Found a cached ROM list. Use it?',
            default: true,
            when: () => hasCache
        },
        {
            type: 'confirm',
            name: 'clearCache',
            message: 'Clear ROM cache and rescan?',
            default: false,
            when: (answers: any) => hasCache && !answers.useCache
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
            message: osTypeAnswer.osType === 'spruceos'
                ? 'How should unfound roms be handled? (SpruceOS requires omitting - cannot list missing files)'
                : 'How should unfound roms be handled?',
            choices: [
                { name: 'Mark with [X] (DEFAULT)', value: 'mark', disabled: osTypeAnswer.osType === 'spruceos' ? 'Not supported by SpruceOS' : false },
                { name: 'Omit from list', value: 'omit' },
            ],
            default: osTypeAnswer.osType === 'spruceos' ? 'omit' : 'mark',
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

    const preferences = await inquirer.prompt(preferenceQuestions);

    // Ensure useCache has a default value if not prompted
    const useCache = preferences.useCache !== undefined ? preferences.useCache : false;

    // Clear cache if requested
    if (preferences.clearCache && fs.existsSync(CACHE_FILE)) {
        fs.removeSync(CACHE_FILE);
        console.log(chalk.green('[SUCCESS] ROM cache cleared'));
    }

    // SpruceOS requires omitting missing ROMs (cannot list missing files)
    if (osTypeAnswer.osType === 'spruceos' && preferences.missingHandle === 'mark') {
        console.log(chalk.yellow('\n[WARNING] SpruceOS does not support listing missing files.'));
        console.log(chalk.yellow('          Automatically switching to "Omit" mode to prevent crashes.\n'));
        preferences.missingHandle = 'omit';
    }

    return {
        connectionMode: connectionModeAnswer.connectionMode,
        osType: osTypeAnswer.osType,
        ...connectionDetails,
        ...pathAnswers,
        ...preferences,
        useCache
    } as Settings;
}

export async function loadOrPromptSettings(): Promise<Settings> {
    const hasSettingsCache = fs.existsSync(SETTINGS_FILE);

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
            const cachedSettings = fs.readJsonSync(SETTINGS_FILE) as Settings;
            // Re-evaluate useCache based on whether ROM cache file exists
            const hasRomCache = fs.existsSync(CACHE_FILE);
            cachedSettings.useCache = cachedSettings.useCache && hasRomCache;
            return cachedSettings;
        } else {
            // User wants to configure new settings
            const answers = await promptForSettings();
            // Save new settings
            fs.writeJsonSync(SETTINGS_FILE, answers);
            return answers;
        }
    } else {
        // First run - no settings cache
        const answers = await promptForSettings();
        // Save settings for next time
        fs.writeJsonSync(SETTINGS_FILE, answers);
        return answers;
    }
}

