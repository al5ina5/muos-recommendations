import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { SSHConnection } from '../utils/ssh-connection.js';
import { LocalConnection } from '../utils/local-connection.js';
import { RomMatcher } from '../utils/matcher.js';
import { COLLECTIONS } from '../data/recommendations.js';
import { MuOSFormatter } from '../utils/formatters/muos-formatter.js';
import { SpruceOSFormatter } from '../utils/formatters/spruceos-formatter.js';
import { CACHE_FILE, COLLECTION_CACHE_DIR } from './constants.js';
import { sanitizeFilename } from '../utils/helpers.js';
import { showSuccessBanner } from '../cli/output.js';
export async function executeWithSettings(answers, flags) {
    // Initialize connection
    let connection;
    if (answers.connectionMode === 'ssh') {
        connection = new SSHConnection();
        try {
            if (!flags.quiet) {
                console.log(chalk.yellow('\n[INFO] Connecting to device...'));
            }
            // SpruceOS uses different credentials
            const sshConfig = answers.osType === 'spruceos'
                ? { host: answers.ip, username: 'spruce', password: 'happygaming' }
                : { host: answers.ip, username: 'root', password: 'root' };
            await connection.connect(sshConfig);
            console.log(chalk.green('[SUCCESS] Connected!\n'));
        }
        catch (error) {
            console.error(chalk.red('\n[ERROR] Failed to connect to device'));
            console.error(chalk.red(`        Error: ${error.message}\n`));
            console.log(chalk.yellow('[INFO] Troubleshooting steps:'));
            console.log(chalk.white('       1. Verify the IP address is correct'));
            console.log(chalk.white('       2. Ensure SSH is enabled on your device'));
            console.log(chalk.white('       3. Check that your computer and device are on the same Wi-Fi network'));
            console.log(chalk.white('       4. Try connecting manually: ssh ' + (answers.osType === 'spruceos' ? 'spruce' : 'root') + '@' + answers.ip));
            console.log(chalk.white('       5. Default credentials: ' + (answers.osType === 'spruceos' ? 'spruce/happygaming' : 'root/root') + '\n'));
            process.exit(1);
        }
    }
    else {
        connection = new LocalConnection({ basePath: answers.localPath });
        try {
            await connection.connect();
            console.log(chalk.green('[SUCCESS] Local folder connection ready!\n'));
        }
        catch (error) {
            console.error(chalk.red('\n[ERROR] Failed to access local folder'));
            console.error(chalk.red(`        Error: ${error.message}\n`));
            console.log(chalk.yellow('[INFO] Troubleshooting steps:'));
            console.log(chalk.white('       1. Verify the folder path exists: ' + answers.localPath));
            console.log(chalk.white('       2. Check that you have read/write permissions'));
            console.log(chalk.white('       3. Ensure the SD card is properly mounted (if using SD card)'));
            console.log(chalk.white('       4. Try using an absolute path instead of relative path\n'));
            process.exit(1);
        }
    }
    // Initialize formatter based on OS type
    const formatter = answers.osType === 'muos'
        ? new MuOSFormatter()
        : new SpruceOSFormatter();
    let errorOccurred = false;
    try {
        let roms = [];
        if (answers.useCache) {
            console.log(chalk.yellow('[INFO] Using cached ROM list...\n'));
            roms = fs.readJsonSync(CACHE_FILE);
        }
        if (roms.length === 0) {
            const actionText = answers.connectionMode === 'ssh'
                ? '[INFO] Fetching ROM list from device (this may take a minute)...'
                : '[INFO] Scanning local folder for ROMs...';
            console.log(chalk.yellow(actionText));
            // Progress indicator (works better for local mode, but shows final count for SSH)
            let progressInterval = null;
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
                    const allRoms = [];
                    for (const romPath of answers.romPaths) {
                        const pathRoms = await connection.listRomsRecursively(romPath, (count) => {
                            lastCount = count;
                        });
                        allRoms.push(...pathRoms);
                    }
                    // Remove duplicates (same path might appear in multiple locations)
                    roms = Array.from(new Set(allRoms));
                }
                else {
                    roms = await connection.listRomsRecursively(answers.romPath, (count) => {
                        lastCount = count;
                    });
                }
            }
            finally {
                if (progressInterval) {
                    clearInterval(progressInterval);
                    process.stdout.write('\r'); // Clear the progress line
                }
            }
            fs.writeJsonSync(CACHE_FILE, roms);
            console.log(chalk.green(`\n[SUCCESS] Found ${roms.length} ROMs and cached them.`));
        }
        else {
            console.log(chalk.green(`[SUCCESS] Using ${roms.length} cached ROMs`));
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
        console.log(chalk.yellow('\n[INFO] Generating collections...\n'));
        await fs.emptyDir(COLLECTION_CACHE_DIR);
        const selectedCollections = COLLECTIONS.filter(c => answers.categories.includes(c.category));
        if (answers.osType === 'spruceos') {
            // SpruceOS: Generate single collections.json file with all collections
            const spruceFormatter = formatter;
            const allCollections = [];
            let totalFound = 0;
            let totalGames = 0;
            let skippedCollections = 0;
            for (const collection of selectedCollections) {
                const collectionDirName = sanitizeFilename(collection.title);
                // Process all games in parallel for matching
                const gameMatches = await Promise.all(collection.games.map(async (game, i) => {
                    const match = matcher.findMatch(game.name, game.system);
                    return { game, match, index: i };
                }));
                let foundCount = 0;
                const gamesWithOptions = gameMatches.map(({ game, match, index: i }) => {
                    if (match)
                        foundCount++;
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
                console.log(chalk.white(`  [OK] Processed '${chalk.green.bold(collectionDirName)}' (${chalk.white.bold(`${foundCount}/${collection.games.length}`)} matched, ${chalk.white.bold(`${percentage}%`)})`));
            }
            // Write single collections.json file (only if we have collections)
            if (allCollections.length > 0) {
                const collectionsPath = path.join(COLLECTION_CACHE_DIR, 'collections.json');
                await fs.writeFile(collectionsPath, JSON.stringify(allCollections, null, 2));
                const totalPercentage = ((totalFound / totalGames) * 100).toFixed(1);
                const percentageNum = parseFloat(totalPercentage);
                console.log(chalk.green(`\n[SUCCESS] Generated collections.json (${totalFound}/${totalGames} total games matched, ${totalPercentage}%)`));
                // Encouraging comment based on percentage
                let encouragingComment = '';
                if (percentageNum >= 90) {
                    encouragingComment = chalk.cyan('  [EXCELLENT] Your ROM collection is outstanding!');
                }
                else if (percentageNum >= 75) {
                    encouragingComment = chalk.green('  [GREAT] You\'ve got most of the classics covered!');
                }
                else if (percentageNum >= 50) {
                    encouragingComment = chalk.yellow('  [GOOD] Solid collection, but you\'re missing some gems...');
                }
                else if (percentageNum >= 25) {
                    encouragingComment = chalk.magenta('  [DECENT] Good start! Consider adding more classics.');
                }
                else {
                    encouragingComment = chalk.red('  [NOTE] Your collection could use more ROMs. Missing many classics!');
                }
                console.log(encouragingComment);
                if (skippedCollections > 0) {
                    console.log(chalk.yellow(`Skipped ${skippedCollections} empty collection(s) (0 matches)`));
                }
            }
            else {
                console.log(chalk.red('\nNo collections generated - all collections had 0 matches.'));
            }
        }
        else {
            // muOS: individual .cfg files per game
            for (const collection of selectedCollections) {
                const collectionDirName = sanitizeFilename(collection.title);
                const collectionLocalPath = path.join(COLLECTION_CACHE_DIR, collectionDirName);
                await fs.ensureDir(collectionLocalPath);
                // Process all games in parallel for matching
                const gameMatches = await Promise.all(collection.games.map(async (game, i) => {
                    const match = matcher.findMatch(game.name, game.system);
                    return { game, match, index: i };
                }));
                let foundCount = 0;
                const writePromises = [];
                for (const { game, match, index: i } of gameMatches) {
                    if (!match && answers.missingHandle === 'omit')
                        continue;
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
                    writePromises.push(fs.writeFile(path.join(collectionLocalPath, fileName), content)
                        .catch((writeErr) => {
                        console.error(chalk.red(`  [ERROR] Failed to write local file: ${fileName}`), writeErr.message);
                        throw writeErr;
                    }));
                    if (match)
                        foundCount++;
                }
                // Skip collections with 0 matched games
                if (foundCount === 0) {
                    console.log(chalk.gray(`  [SKIP] '${collectionDirName}' (0/${collection.games.length} matched - empty collection)`));
                    // Remove empty collection directory
                    await fs.remove(collectionLocalPath);
                    continue;
                }
                await Promise.all(writePromises);
                const percentage = ((foundCount / collection.games.length) * 100).toFixed(1);
                console.log(chalk.white(`  [OK] Generated '${chalk.green.bold(collectionDirName)}' (${chalk.white.bold(`${foundCount}/${collection.games.length}`)} matched, ${chalk.white.bold(`${percentage}%`)})`));
            }
        }
        if (answers.confirmDeploy) {
            console.log(chalk.yellow('\n[INFO] Deploying collections...\n'));
            const remoteBaseDir = answers.collectionPath;
            if (answers.clearExisting) {
                console.log(chalk.yellow('  Clearing existing collections...'));
                await connection.clearCollections(remoteBaseDir);
                console.log(chalk.green('  [SUCCESS] Cleared existing collections\n'));
            }
            if (answers.osType === 'spruceos') {
                // SpruceOS: Deploy single collections.json file
                const localFile = path.join(COLLECTION_CACHE_DIR, 'collections.json');
                const remoteFile = path.join(remoteBaseDir, 'collections.json');
                console.log(chalk.white(`  Deploying collections.json...`));
                if (answers.connectionMode === 'ssh') {
                    // For SSH, upload single file using MuOSClient
                    const sshConnection = connection;
                    await sshConnection.client.uploadFile(localFile, remoteFile);
                }
                else {
                    // Local: copy file
                    await fs.ensureDir(remoteBaseDir);
                    await fs.copyFile(localFile, remoteFile);
                }
            }
            else {
                // muOS: Deploy collection folders
                const collectionFolders = await fs.readdir(COLLECTION_CACHE_DIR);
                for (const folder of collectionFolders) {
                    const localFolder = path.join(COLLECTION_CACHE_DIR, folder);
                    const remoteFolder = path.join(remoteBaseDir, folder);
                    console.log(chalk.white(`  Deploying collection: ${chalk.cyan(folder)}...`));
                    await connection.deployCollections(localFolder, remoteFolder);
                }
            }
            console.log(chalk.green('\n[SUCCESS] Deployment complete!\n'));
            // SpruceOS-specific instructions
            if (answers.osType === 'spruceos') {
                console.log(chalk.yellow('[INFO] SpruceOS Setup Instructions:'));
                console.log(chalk.white('       1. Reload UI: Settings => Reload UI'));
                console.log(chalk.white('       2. Enable Collections: Settings => Theme Settings => Main Menu => Theme Options => Show Collections'));
                console.log(chalk.gray('          Note: This path may vary depending on your theme.\n'));
            }
        }
        showSuccessBanner(COLLECTION_CACHE_DIR);
        // Show SpruceOS instructions even if deployment was skipped
        if (answers.osType === 'spruceos' && !answers.confirmDeploy) {
            console.log(chalk.yellow('[INFO] SpruceOS Setup Instructions:'));
            console.log(chalk.white('       1. Reload UI: Settings => Reload UI'));
            console.log(chalk.white('       2. Enable Collections: Settings => Theme Settings => Main Menu => Theme Options => Show Collections'));
            console.log(chalk.gray('          Note: This path may vary depending on your theme.\n'));
        }
    }
    catch (error) {
        console.error(chalk.red('\nAn error occurred:'), error.message);
        errorOccurred = true;
    }
    finally {
        await connection.disconnect();
    }
    if (errorOccurred) {
        process.exit(1);
    }
}
