import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { Settings } from '../types.js';
import { CACHE_FILE, SETTINGS_FILE } from '../constants.js';

export async function promptForSettings(): Promise<Settings> {
    // Ask for OS type first
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

    // Ask if using SSH (IP provided) or local mode
    const connectionAnswer = await inquirer.prompt([
        {
            type: 'list',
            name: 'connectionType',
            message: 'How do you want to access your device?',
            choices: [
                { name: 'SSH (remote device on network)', value: 'ssh' },
                { name: 'Local Folder (SD card mounted or local folder)', value: 'local' }
            ],
            default: 'ssh'
        }
    ]);

    // Connection-specific questions
    let connectionMode: 'ssh' | 'local';
    let connectionDetails: any = {};

    if (connectionAnswer.connectionType === 'ssh') {
        connectionMode = 'ssh';
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
        connectionMode = 'local';
    }

    // Determine default paths based on OS and mode
    let defaultRomPath: string;
    let defaultRomPaths: string[] | undefined;
    let defaultCollectionPath: string;

    if (osTypeAnswer.osType === 'spruceos') {
        // SpruceOS supports multiple ROM paths
        defaultRomPaths = connectionMode === 'ssh'
            ? ['/mnt/sdcard/Roms', '/media/sdcard1/Roms']
            : ['/Volumes/SDCARD/Roms', '/Volumes/SDCARD/media/sdcard1/Roms'];
        defaultRomPath = defaultRomPaths[0];
        defaultCollectionPath = connectionMode === 'ssh'
            ? '/mnt/sdcard/Collections'
            : '/Volumes/SDCARD/Collections';
    } else {
        // muOS uses single path
        defaultRomPath = connectionMode === 'ssh'
            ? '/mnt/sdcard/ROMS'
            : '/Volumes/SDCARD/ROMS';
        defaultCollectionPath = connectionMode === 'ssh'
            ? '/mnt/mmc/MUOS/info/collection'
            : '/Volumes/SDCARD/MUOS/info/collection';
    }

    const pathQuestions: any[] = [];

    // Single ROMs path question (supports comma-separated for SpruceOS)
    const romsPathDefault = osTypeAnswer.osType === 'spruceos'
        ? defaultRomPaths!.join(',')
        : defaultRomPath;

    pathQuestions.push({
        type: 'input',
        name: 'romsPath',
        message: 'Enter ROMs path(s) (comma-separated, absolute paths):',
        default: romsPathDefault,
        filter: (input: string) => {
            // Split by comma and trim each path
            return input.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
        },
        validate: (input: string) => {
            const paths = input.split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
            if (paths.length === 0) {
                return 'At least one ROM path is required';
            }
            // In local mode, validate paths exist
            if (connectionMode === 'local') {
                for (const p of paths) {
                    if (!fs.existsSync(p)) {
                        return `Path does not exist: ${p}`;
                    }
                }
            }
            return true;
        }
    });

    pathQuestions.push({
        type: 'input',
        name: 'collectionPath',
        message: 'Enter collections output path (absolute path):',
        default: defaultCollectionPath,
        validate: (input: string) => {
            if (!input.trim()) {
                return 'Collections path is required';
            }
            return true;
        }
    });

    const pathAnswers = await inquirer.prompt(pathQuestions);

    // Convert romsPath to romPath and romPaths for backward compatibility
    const romsPaths = pathAnswers.romsPath || [];
    pathAnswers.romPath = romsPaths[0];
    if (romsPaths.length > 1) {
        pathAnswers.romPaths = romsPaths;
    }

    // Derive localPath from roms path for local mode (common parent directory)
    let localPath: string | undefined;
    if (connectionMode === 'local') {
        const firstRomPath = pathAnswers.romPath || (pathAnswers.romPaths ? pathAnswers.romPaths[0] : '');
        if (firstRomPath) {
            localPath = path.dirname(firstRomPath);
        }
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
                ? `Found cached ROM list (${cacheInfo.romCount || 'unknown'} ROMs, ${cacheInfo.age} old). Use it? (No = rescan)`
                : 'Found a cached ROM list. Use it? (No = rescan)',
            default: false,
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

    // Default: no cache (always rescan)
    // Only use cache if user explicitly chooses to (or if --cache flag provided in non-interactive mode)
    const useCache = preferences.useCache !== undefined ? preferences.useCache : false;

    // SpruceOS requires omitting missing ROMs (cannot list missing files)
    if (osTypeAnswer.osType === 'spruceos' && preferences.missingHandle === 'mark') {
        console.log(chalk.yellow('\n[WARNING] SpruceOS does not support listing missing files.'));
        console.log(chalk.yellow('          Automatically switching to "Omit" mode to prevent crashes.\n'));
        preferences.missingHandle = 'omit';
    }

    return {
        connectionMode: connectionMode,
        osType: osTypeAnswer.osType,
        ...connectionDetails,
        localPath: localPath,
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

