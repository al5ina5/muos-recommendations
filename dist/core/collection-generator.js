import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { COLLECTION_CACHE_DIR } from '../constants.js';
function sanitizeFilename(name) {
    return name.replace(/[\\/:*?"<>|]/g, '-');
}
export async function generateCollections(collections, matcher, formatter, settings) {
    console.log(chalk.yellow('\n[INFO] Generating collections...\n'));
    await fs.emptyDir(COLLECTION_CACHE_DIR);
    if (settings.osType === 'spruceos') {
        await generateSpruceOSCollections(collections, matcher, formatter, settings);
    }
    else {
        await generateMuOSCollections(collections, matcher, formatter, settings);
    }
}
async function generateSpruceOSCollections(collections, matcher, formatter, settings) {
    const spruceFormatter = formatter; // SpruceOSFormatter
    const allCollections = [];
    let totalFound = 0;
    let totalGames = 0;
    let skippedCollections = 0;
    for (const collection of collections) {
        const collectionDirName = sanitizeFilename(collection.title);
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
                    useNumbers: settings.useNumbers,
                    index: i,
                    missingHandle: settings.missingHandle
                }
            };
        });
        if (foundCount === 0) {
            skippedCollections++;
            console.log(chalk.gray(`- Skipped '${collectionDirName}' (0/${collection.games.length} matched - empty collection)`));
            continue;
        }
        const spruceCollection = spruceFormatter.formatCollection(collectionDirName, gamesWithOptions);
        allCollections.push(spruceCollection);
        totalFound += foundCount;
        totalGames += collection.games.length;
        const percentage = ((foundCount / collection.games.length) * 100).toFixed(1);
        console.log(chalk.white(`  [OK] Processed '${chalk.green.bold(collectionDirName)}' (${chalk.white.bold(`${foundCount}/${collection.games.length}`)} matched, ${chalk.white.bold(`${percentage}%`)})`));
    }
    if (allCollections.length > 0) {
        const collectionsPath = path.join(COLLECTION_CACHE_DIR, 'collections.json');
        await fs.writeFile(collectionsPath, JSON.stringify(allCollections, null, 2));
        const totalPercentage = ((totalFound / totalGames) * 100).toFixed(1);
        const percentageNum = parseFloat(totalPercentage);
        console.log(chalk.green(`\n[SUCCESS] Generated collections.json (${totalFound}/${totalGames} total games matched, ${totalPercentage}%)`));
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
async function generateMuOSCollections(collections, matcher, formatter, settings) {
    for (const collection of collections) {
        const collectionDirName = sanitizeFilename(collection.title);
        const collectionLocalPath = path.join(COLLECTION_CACHE_DIR, collectionDirName);
        await fs.ensureDir(collectionLocalPath);
        const gameMatches = await Promise.all(collection.games.map(async (game, i) => {
            const match = matcher.findMatch(game.name, game.system);
            return { game, match, index: i };
        }));
        let foundCount = 0;
        const writePromises = [];
        for (const { game, match, index: i } of gameMatches) {
            if (!match && settings.missingHandle === 'omit')
                continue;
            const cleanName = game.display || game.name;
            const orderPrefix = settings.useNumbers ? `${(i + 1).toString().padStart(2, '0')}. ` : '';
            const safeFileName = sanitizeFilename(`${orderPrefix}${cleanName}`);
            const fileExtension = formatter.getFileExtension();
            const fileName = `${safeFileName}${fileExtension}`;
            const content = formatter.formatGame(game, match, {
                useNumbers: settings.useNumbers,
                index: i,
                missingHandle: settings.missingHandle
            });
            writePromises.push(fs.writeFile(path.join(collectionLocalPath, fileName), content)
                .catch((writeErr) => {
                console.error(chalk.red(`  [ERROR] Failed to write local file: ${fileName}`), writeErr.message);
                throw writeErr;
            }));
            if (match)
                foundCount++;
        }
        if (foundCount === 0) {
            console.log(chalk.gray(`  [SKIP] '${collectionDirName}' (0/${collection.games.length} matched - empty collection)`));
            await fs.remove(collectionLocalPath);
            continue;
        }
        await Promise.all(writePromises);
        const percentage = ((foundCount / collection.games.length) * 100).toFixed(1);
        console.log(chalk.white(`  [OK] Generated '${chalk.green.bold(collectionDirName)}' (${chalk.white.bold(`${foundCount}/${collection.games.length}`)} matched, ${chalk.white.bold(`${percentage}%`)})`));
    }
}
