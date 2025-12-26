import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { IConnection } from './utils/connection.js';
import { SSHConnection } from './utils/ssh-connection.js';
import { LocalConnection } from './utils/local-connection.js';
import { SSHConfig } from './utils/muos-client.js';
import { RomMatcher, RomFile } from './utils/matcher.js';
import { COLLECTIONS, Collection, Recommendation } from './data/recommendations.js';
import { ICollectionFormatter } from './utils/collection-formatter.js';
import { MuOSFormatter } from './utils/formatters/muos-formatter.js';
import { SpruceOSFormatter } from './utils/formatters/spruceos-formatter.js';

const CACHE_FILE = path.join(process.cwd(), '.cache', 'cache.json');
const SETTINGS_FILE = path.join(process.cwd(), '.cache', 'settings.json');
const COLLECTION_CACHE_DIR = path.join(process.cwd(), '.cache', 'collections');

function sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '-');
}


interface Settings {
    connectionMode: 'ssh' | 'local';
    osType: 'muos' | 'spruceos';
    ip?: string;  // Only for SSH
    localPath?: string;  // Only for local mode
    romPath: string;  // For muOS (single path)
    romPaths?: string[];  // For SpruceOS (multiple paths)
    collectionPath: string;
    useCache: boolean;
    categories: string[];
    missingHandle: 'mark' | 'omit';
    useNumbers: boolean;
    confirmDeploy: boolean;
    clearExisting: boolean;
}

function displaySettings(settings: Settings): void {
    console.log(chalk.cyan.bold('\n--- Pre-configured Settings ---'));
    console.log(chalk.white(`  Connection Mode: ${chalk.yellow(settings.connectionMode === 'ssh' ? 'SSH' : 'Local Folder')}`));
    console.log(chalk.white(`  OS Type: ${chalk.yellow(settings.osType === 'muos' ? 'muOS' : 'SpruceOS')}`));
    if (settings.connectionMode === 'ssh') {
        console.log(chalk.white(`  Device IP: ${chalk.yellow(settings.ip || 'N/A')}`));
    } else {
        console.log(chalk.white(`  Local Path: ${chalk.yellow(settings.localPath || 'N/A')}`));
    }
    console.log(chalk.white(`  ROMs Path: ${chalk.yellow(settings.romPath)}`));
    console.log(chalk.white(`  Collection Path: ${chalk.yellow(settings.collectionPath)}`));
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

function displaySummary(settings: Settings): void {
    console.log(chalk.cyan.bold('\n========================================'));
    console.log(chalk.cyan.bold('           SETTINGS SUMMARY'));
    console.log(chalk.cyan.bold('========================================'));
    console.log(chalk.white(`  Connection Mode: ${chalk.yellow(settings.connectionMode === 'ssh' ? 'SSH (remote device on network)' : 'Local Folder (SD card mounted or local folder)')}`));
    console.log(chalk.white(`  OS Type: ${chalk.yellow(settings.osType === 'muos' ? 'muOS' : 'SpruceOS (Miyoo Flip)')}`));
    if (settings.connectionMode === 'ssh') {
        console.log(chalk.white(`  Device IP: ${chalk.yellow(settings.ip || 'N/A')}`));
    } else {
        console.log(chalk.white(`  Local Folder Path: ${chalk.yellow(settings.localPath || 'N/A')}`));
    }
    if (settings.osType === 'spruceos' && settings.romPaths) {
        console.log(chalk.white(`  ROMs Paths: ${chalk.yellow(settings.romPaths.join(', '))}`));
    } else {
        console.log(chalk.white(`  ROMs Path: ${chalk.yellow(settings.romPath)}`));
    }
    console.log(chalk.white(`  Collection Output Path: ${chalk.yellow(settings.collectionPath)}`));
    console.log(chalk.white(`  Use ROM Cache: ${chalk.yellow(settings.useCache ? 'Yes' : 'No')}`));
    console.log(chalk.white(`  Selected Categories: ${chalk.yellow(settings.categories.join(', '))}`));
    console.log(chalk.white(`  Missing ROMs Handling: ${chalk.yellow(settings.missingHandle === 'mark' ? 'Mark with [X]' : 'Omit')}`));
    console.log(chalk.white(`  Display Numbers: ${chalk.yellow(settings.useNumbers ? 'Yes' : 'No')}`));
    console.log(chalk.white(`  Auto Deploy: ${chalk.yellow(settings.confirmDeploy ? 'Yes' : 'No')}`));
    if (settings.confirmDeploy) {
        console.log(chalk.white(`  Clear Existing Collections: ${chalk.yellow(settings.clearExisting ? 'Yes' : 'No')}`));
    }
    console.log(chalk.cyan.bold('========================================\n'));
}

async function promptForSettings(): Promise<Settings> {
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
        // Only ask for romPath if it wasn't already set (muOS) or if SpruceOS didn't set it
        // (SpruceOS uses romPaths, so we skip this)
        ...(osTypeAnswer.osType === 'muos' ? [{
            type: 'input',
            name: 'romPath',
            message: connectionModeAnswer.connectionMode === 'ssh'
                ? 'Enter your ROMs folder path on device:'
                : 'Enter your ROMs folder path (relative to local folder root):',
            default: defaultRomPath,
        }] : []),
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
        console.log(chalk.green('✓ ROM cache cleared'));
    }

    // SpruceOS requires omitting missing ROMs (cannot list missing files)
    if (osTypeAnswer.osType === 'spruceos' && preferences.missingHandle === 'mark') {
        console.log(chalk.yellow('\n⚠️  Note: SpruceOS does not support listing missing files.'));
        console.log(chalk.yellow('   Automatically switching to "Omit" mode to prevent crashes.\n'));
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

async function main() {
    // Handle --version flag
    if (process.argv.includes('--version') || process.argv.includes('-v')) {
        const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
        console.log(pkg.version);
        process.exit(0);
    }

    console.log(chalk.cyan.bold('\n========================================'));
    console.log(chalk.cyan.bold('   RETRO CURATOR'));
    console.log(chalk.cyan.bold('========================================'));
    console.log(chalk.white(' This tool helps you create and deploy high-quality'));
    console.log(chalk.white(' game collections to your retro gaming device.'));
    console.log(chalk.white(' Choose from curated essentials, franchises, and more.\n'));

    let answers: Settings;
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
            const cachedSettings = fs.readJsonSync(SETTINGS_FILE) as Settings;
            // Re-evaluate useCache based on whether ROM cache file exists
            const hasRomCache = fs.existsSync(CACHE_FILE);
            cachedSettings.useCache = cachedSettings.useCache && hasRomCache;
            displaySettings(cachedSettings);
            answers = cachedSettings;
        } else {
            // User wants to configure new settings
            answers = await promptForSettings();
            // Save new settings
            fs.writeJsonSync(SETTINGS_FILE, answers);
        }
    } else {
        // First run - no settings cache
        answers = await promptForSettings();
        // Save settings for next time
        fs.writeJsonSync(SETTINGS_FILE, answers);
    }

    // Show summary and get confirmation
    displaySummary(answers);
    const confirm = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'proceed',
            message: 'Proceed with these settings?',
            default: true
        }
    ]);

    if (!confirm.proceed) {
        console.log(chalk.yellow('\nCancelled. Run the tool again to configure new settings.\n'));
        process.exit(0);
    }

    // Initialize connection
    let connection: IConnection;
    if (answers.connectionMode === 'ssh') {
        connection = new SSHConnection();
        try {
            console.log(chalk.yellow('\nConnecting to device...'));
            // SpruceOS uses different credentials
            const sshConfig = answers.osType === 'spruceos'
                ? { host: answers.ip!, username: 'spruce', password: 'happygaming' }
                : { host: answers.ip!, username: 'root', password: 'root' };
            await connection.connect(sshConfig);
            console.log(chalk.green('Connected!'));
        } catch (error: any) {
            console.error(chalk.red('\n❌ Failed to connect to device'));
            console.error(chalk.red(`   Error: ${error.message}\n`));
            console.log(chalk.yellow('💡 Troubleshooting steps:'));
            console.log(chalk.white('   1. Verify the IP address is correct'));
            console.log(chalk.white('   2. Ensure SSH is enabled on your device'));
            console.log(chalk.white('   3. Check that your computer and device are on the same Wi-Fi network'));
            console.log(chalk.white('   4. Try connecting manually: ssh ' + (answers.osType === 'spruceos' ? 'spruce' : 'root') + '@' + answers.ip));
            console.log(chalk.white('   5. Default credentials: ' + (answers.osType === 'spruceos' ? 'spruce/happygaming' : 'root/root') + '\n'));
            process.exit(1);
        }
    } else {
        connection = new LocalConnection({ basePath: answers.localPath! });
        try {
            await connection.connect();
            console.log(chalk.green('Local folder connection ready!'));
        } catch (error: any) {
            console.error(chalk.red('\n❌ Failed to access local folder'));
            console.error(chalk.red(`   Error: ${error.message}\n`));
            console.log(chalk.yellow('💡 Troubleshooting steps:'));
            console.log(chalk.white('   1. Verify the folder path exists: ' + answers.localPath));
            console.log(chalk.white('   2. Check that you have read/write permissions'));
            console.log(chalk.white('   3. Ensure the SD card is properly mounted (if using SD card)'));
            console.log(chalk.white('   4. Try using an absolute path instead of relative path\n'));
            process.exit(1);
        }
    }

    // Initialize formatter based on OS type
    const formatter: ICollectionFormatter = answers.osType === 'muos'
        ? new MuOSFormatter()
        : new SpruceOSFormatter();

    let errorOccurred = false;
    try {
        let roms: string[] = [];
        if (answers.useCache) {
            console.log(chalk.yellow('Using cached ROM list...'));
            roms = fs.readJsonSync(CACHE_FILE);
        }

        if (roms.length === 0) {
            const actionText = answers.connectionMode === 'ssh'
                ? 'Fetching ROM list from device (this may take a minute)...'
                : 'Scanning local folder for ROMs...';
            console.log(chalk.yellow(actionText));

            // Progress indicator (works better for local mode, but shows final count for SSH)
            let progressInterval: NodeJS.Timeout | null = null;
            let lastCount = 0;
            
            progressInterval = setInterval(() => {
                if (lastCount > 0) {
                    const mode = answers.connectionMode === 'ssh' ? 'Fetching from device...' : 'Scanning...';
                    process.stdout.write(`\r${chalk.yellow(mode)} ${chalk.white(lastCount)} ROMs found`);
                }
            }, 500);

            try {
                // For SpruceOS, scan multiple paths
                if (answers.osType === 'spruceos' && answers.romPaths && answers.romPaths.length > 0) {
                    const allRoms: string[] = [];
                    for (const romPath of answers.romPaths) {
                        const pathRoms = await connection.listRomsRecursively(romPath, (count) => {
                            lastCount = count;
                        });
                        allRoms.push(...pathRoms);
                    }
                    // Remove duplicates (same path might appear in multiple locations)
                    roms = Array.from(new Set(allRoms));
                } else {
                    roms = await connection.listRomsRecursively(answers.romPath, (count) => {
                        lastCount = count;
                    });
                }
            } finally {
                if (progressInterval) {
                    clearInterval(progressInterval);
                    process.stdout.write('\r'); // Clear the progress line
                }
            }

            fs.writeJsonSync(CACHE_FILE, roms);
            console.log(chalk.green(`✓ Found ${roms.length} ROMs and cached them.`));
        } else {
            console.log(chalk.green(`✓ Using ${roms.length} cached ROMs`));
        }

        // Process ROMs for the matcher
        const romFiles: RomFile[] = roms
            .filter(r => {
                // Filter out macOS metadata files
                if (path.basename(r).startsWith('._')) return false;

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

        if (answers.osType === 'spruceos') {
            // SpruceOS: Generate single collections.json file with all collections
            const spruceFormatter = formatter as SpruceOSFormatter;
            const allCollections: import('./utils/formatters/spruceos-formatter.js').SpruceOSCollection[] = [];
            let totalFound = 0;
            let totalGames = 0;
            let skippedCollections = 0;

            for (const collection of selectedCollections) {
                const collectionDirName = sanitizeFilename(collection.title);

                // Process all games in parallel for matching
                const gameMatches = await Promise.all(
                    collection.games.map(async (game, i) => {
                        const match = matcher.findMatch(game.name, game.system);
                        return { game, match, index: i };
                    })
                );

                let foundCount = 0;
                const gamesWithOptions = gameMatches.map(({ game, match, index: i }) => {
                    if (match) foundCount++;
                    return {
                        game,
                        match,
                        options: {
                            useNumbers: answers.useNumbers,
                            index: i,
                            missingHandle: answers.missingHandle
                        }
                    };
                });

                // Skip collections with 0 matched games
                if (foundCount === 0) {
                    skippedCollections++;
                    console.log(chalk.gray(`- Skipped '${chalk.gray(collectionDirName)}' (0/${collection.games.length} matched - empty collection)`));
                    continue;
                }

                const spruceCollection = spruceFormatter.formatCollection(collectionDirName, gamesWithOptions);
                allCollections.push(spruceCollection);

                totalFound += foundCount;
                totalGames += collection.games.length;

                const percentage = ((foundCount / collection.games.length) * 100).toFixed(1);
                console.log(chalk.white(`- Processed '${chalk.green.bold(collectionDirName)}' (${chalk.white.bold(`${foundCount}/${collection.games.length}`)} matched, ${chalk.white.bold(`${percentage}%`)})`));
            }

            // Write single collections.json file (only if we have collections)
            if (allCollections.length > 0) {
                const collectionsPath = path.join(COLLECTION_CACHE_DIR, 'collections.json');
                await fs.writeFile(collectionsPath, JSON.stringify(allCollections, null, 2));

                const totalPercentage = ((totalFound / totalGames) * 100).toFixed(1);
                const percentageNum = parseFloat(totalPercentage);
                console.log(chalk.green(`\nGenerated collections.json (${totalFound}/${totalGames} total games matched, ${totalPercentage}%)`));

                // Funny comment based on percentage
                let funnyComment = '';
                if (percentageNum >= 90) {
                    funnyComment = chalk.cyan('  🏆 Absolute legend! Your ROM collection is the stuff of dreams!');
                } else if (percentageNum >= 75) {
                    funnyComment = chalk.green('  🎮 Impressive! You\'ve got most of the classics covered!');
                } else if (percentageNum >= 50) {
                    funnyComment = chalk.yellow('  📚 Solid collection! You\'re missing some gems though...');
                } else if (percentageNum >= 25) {
                    funnyComment = chalk.magenta('  🕹️  Decent start! Time to hunt down those missing classics!');
                } else {
                    funnyComment = chalk.red('  🎯 Whoa there! Your collection needs some serious TLC. Missing classics alert! 🚨');
                }
                console.log(funnyComment);

                if (skippedCollections > 0) {
                    console.log(chalk.yellow(`Skipped ${skippedCollections} empty collection(s) (0 matches)`));
                }
            } else {
                console.log(chalk.red('\nNo collections generated - all collections had 0 matches.'));
            }
        } else {
            // muOS: individual .cfg files per game
            for (const collection of selectedCollections) {
                const collectionDirName = sanitizeFilename(collection.title);
                const collectionLocalPath = path.join(COLLECTION_CACHE_DIR, collectionDirName);
                await fs.ensureDir(collectionLocalPath);

                // Process all games in parallel for matching
                const gameMatches = await Promise.all(
                    collection.games.map(async (game, i) => {
                        const match = matcher.findMatch(game.name, game.system);
                        return { game, match, index: i };
                    })
                );

                let foundCount = 0;
                const writePromises: Promise<void>[] = [];

                for (const { game, match, index: i } of gameMatches) {
                    if (!match && answers.missingHandle === 'omit') continue;

                    const cleanName = game.display || game.name;
                    const orderPrefix = answers.useNumbers ? `${(i + 1).toString().padStart(2, '0')}. ` : '';
                    const safeFileName = sanitizeFilename(`${orderPrefix}${cleanName}`);
                    const fileExtension = formatter.getFileExtension();
                    const fileName = `${safeFileName}${fileExtension}`;

                    const content = formatter.formatGame(game, match, {
                        useNumbers: answers.useNumbers,
                        index: i,
                        missingHandle: answers.missingHandle
                    });

                    writePromises.push(
                        fs.writeFile(path.join(collectionLocalPath, fileName), content)
                            .catch((writeErr: any) => {
                                console.error(chalk.red(`  ! Failed to write local file: ${fileName}`), writeErr.message);
                                throw writeErr;
                            })
                    );

                    if (match) foundCount++;
                }

                // Skip collections with 0 matched games
                if (foundCount === 0) {
                    console.log(chalk.gray(`- Skipped '${chalk.gray(collectionDirName)}' (0/${collection.games.length} matched - empty collection)`));
                    // Remove empty collection directory
                    await fs.remove(collectionLocalPath);
                    continue;
                }

                await Promise.all(writePromises);

                const percentage = ((foundCount / collection.games.length) * 100).toFixed(1);
                console.log(chalk.white(`- Generated '${chalk.green.bold(collectionDirName)}' (${chalk.white.bold(`${foundCount}/${collection.games.length}`)} matched, ${chalk.white.bold(`${percentage}%`)})`));
            }
        }

        if (answers.confirmDeploy) {
            console.log(chalk.yellow('\n📤 Deploying collections...'));
            const remoteBaseDir = answers.collectionPath;

            if (answers.clearExisting) {
                console.log(chalk.yellow('  Clearing existing collections...'));
                await connection.clearCollections(remoteBaseDir);
                console.log(chalk.green('  ✓ Cleared existing collections'));
            }

            if (answers.osType === 'spruceos') {
                // SpruceOS: Deploy single collections.json file
                const localFile = path.join(COLLECTION_CACHE_DIR, 'collections.json');
                const remoteFile = path.join(remoteBaseDir, 'collections.json');

                console.log(chalk.white(`  Deploying collections.json...`));

                if (answers.connectionMode === 'ssh') {
                    // For SSH, upload single file
                    const sshConnection = connection as import('./utils/ssh-connection.js').SSHConnection;
                    await sshConnection.uploadFile(localFile, remoteFile);
                } else {
                    // Local: copy file
                    await fs.ensureDir(remoteBaseDir);
                    await fs.copyFile(localFile, remoteFile);
                }
            } else {
                // muOS: Deploy collection folders
                const collectionFolders = await fs.readdir(COLLECTION_CACHE_DIR);
                for (const folder of collectionFolders) {
                    const localFolder = path.join(COLLECTION_CACHE_DIR, folder);
                    const remoteFolder = path.join(remoteBaseDir, folder);

                    console.log(chalk.white(`  Deploying ${folder}...`));
                    await connection.deployCollections(localFolder, remoteFolder);
                }
            }
            console.log(chalk.green('Deployment complete!'));

            // SpruceOS-specific instructions
            if (answers.osType === 'spruceos') {
                console.log(chalk.yellow('\n📱 SpruceOS Setup Instructions:'));
                console.log(chalk.white('  1. Reload UI: Settings => Reload UI'));
                console.log(chalk.white('  2. Enable Collections: Settings => Theme Settings => Main Menu => Theme Options => Show Collections'));
                console.log(chalk.gray('     Note: This path may vary depending on your theme.'));
            }
        }

        console.log(chalk.cyan.bold('\nTask finished successfully! Enjoy your games.'));
        console.log(chalk.gray(`Collections are stored in: ${COLLECTION_CACHE_DIR}`));

        // Show SpruceOS instructions even if deployment was skipped
        if (answers.osType === 'spruceos' && !answers.confirmDeploy) {
            console.log(chalk.yellow('\n📱 SpruceOS Setup Instructions:'));
            console.log(chalk.white('  1. Reload UI: Settings => Reload UI'));
            console.log(chalk.white('  2. Enable Collections: Settings => Theme Settings => Main Menu => Theme Options => Show Collections'));
            console.log(chalk.gray('     Note: This path may vary depending on your theme.'));
        }

    } catch (error: any) {
        console.error(chalk.red('\nAn error occurred:'), error.message);
        errorOccurred = true;
    } finally {
        await connection.disconnect();
    }

    if (errorOccurred) {
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(chalk.red('\nUnhandled error:'), error);
    process.exit(1);
});
