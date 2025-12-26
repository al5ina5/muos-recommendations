import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { IConnection, Settings } from '../types.js';
import { SSHConnection } from '../utils/connections/ssh.js';
import { COLLECTION_CACHE_DIR } from '../constants.js';

export async function deployCollections(connection: IConnection, settings: Settings): Promise<void> {
    console.log(chalk.yellow('\n[INFO] Deploying collections...\n'));
    const remoteBaseDir = settings.collectionPath;

    if (settings.clearExisting) {
        console.log(chalk.yellow('  Clearing existing collections...'));
        await connection.clearCollections(remoteBaseDir);
        console.log(chalk.green('  [SUCCESS] Cleared existing collections\n'));
    }

    if (settings.osType === 'spruceos') {
        const localFile = path.join(COLLECTION_CACHE_DIR, 'collections.json');
        const remoteFile = path.join(remoteBaseDir, 'collections.json');

        console.log(chalk.white(`  Deploying collections.json...`));

        if (settings.connectionMode === 'ssh') {
            const sshConnection = connection as SSHConnection;
            await sshConnection.uploadFile(localFile, remoteFile);
        } else {
            await fs.ensureDir(remoteBaseDir);
            await fs.copyFile(localFile, remoteFile);
        }
    } else {
        const collectionFolders = await fs.readdir(COLLECTION_CACHE_DIR);
        for (const folder of collectionFolders) {
            const localFolder = path.join(COLLECTION_CACHE_DIR, folder);
            const remoteFolder = path.join(remoteBaseDir, folder);

            console.log(chalk.white(`  Deploying collection: ${chalk.cyan(folder)}...`));
            await connection.deployCollections(localFolder, remoteFolder);
        }
    }
    console.log(chalk.green('\n[SUCCESS] Deployment complete!\n'));

    if (settings.osType === 'spruceos') {
        console.log(chalk.yellow('[INFO] SpruceOS Setup Instructions:'));
        console.log(chalk.white('       1. Reload UI: Settings => Reload UI'));
        console.log(chalk.white('       2. Enable Collections: Settings => Theme Settings => Main Menu => Theme Options => Show Collections'));
        console.log(chalk.gray('          Note: This path may vary depending on your theme.\n'));
    }
}

export function showSpruceOSInstructions(): void {
    console.log(chalk.yellow('[INFO] SpruceOS Setup Instructions:'));
    console.log(chalk.white('       1. Reload UI: Settings => Reload UI'));
    console.log(chalk.white('       2. Enable Collections: Settings => Theme Settings => Main Menu => Theme Options => Show Collections'));
    console.log(chalk.gray('          Note: This path may vary depending on your theme.\n'));
}

