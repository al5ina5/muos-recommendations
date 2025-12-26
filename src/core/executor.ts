import chalk from 'chalk';
import { IConnection, Settings, ParsedFlags, ICollectionFormatter } from '../types.js';
import { MuOSFormatter } from '../utils/formatters/muos-formatter.js';
import { SpruceOSFormatter } from '../utils/formatters/spruceos-formatter.js';
import { RomMatcher } from '../utils/matcher.js';
import { COLLECTIONS } from '../data/recommendations.js';
import { COLLECTION_CACHE_DIR } from '../constants.js';
import { showSuccessBanner } from '../cli/output.js';
import { createConnection } from './connection-factory.js';
import { scanRoms } from './rom-scanner.js';
import { generateCollections } from './collection-generator.js';
import { deployCollections, showSpruceOSInstructions } from './deployment.js';

export async function executeWithSettings(settings: Settings, flags: ParsedFlags): Promise<void> {
    let connection: IConnection | null = null;

    try {
        connection = await createConnection(settings, flags);

        const formatter: ICollectionFormatter = settings.osType === 'muos'
            ? new MuOSFormatter()
            : new SpruceOSFormatter();

        const romFiles = await scanRoms(connection, settings, flags);
        const matcher = new RomMatcher(romFiles);

        const selectedCollections = COLLECTIONS.filter(c => settings.categories.includes(c.category));
        await generateCollections(selectedCollections, matcher, formatter, settings);

        if (settings.confirmDeploy) {
            await deployCollections(connection, settings);
        }

        showSuccessBanner(COLLECTION_CACHE_DIR);

        if (settings.osType === 'spruceos' && !settings.confirmDeploy) {
            showSpruceOSInstructions();
        }
    } catch (error: any) {
        console.error(chalk.red('\nAn error occurred:'), error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.disconnect();
        }
    }
}
