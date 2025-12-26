import chalk from 'chalk';
import { Settings } from '../types.js';

export function displaySummary(settings: Settings): void {
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

export function showWelcomeBanner(): void {
    console.log(chalk.cyan.bold('\n========================================'));
    console.log(chalk.cyan.bold('   RETRO CURATOR'));
    console.log(chalk.cyan.bold('========================================'));
    console.log(chalk.white(' This tool helps you create and deploy high-quality'));
    console.log(chalk.white(' game collections to your retro gaming device.'));
    console.log(chalk.white(' Choose from curated essentials, franchises, and more.\n'));
}

export function showSuccessBanner(collectionsDir: string): void {
    console.log(chalk.cyan.bold('\n========================================'));
    console.log(chalk.cyan.bold('  TASK COMPLETED SUCCESSFULLY'));
    console.log(chalk.cyan.bold('========================================'));
    console.log(chalk.gray(`\nCollections are stored in: ${collectionsDir}\n`));
}

