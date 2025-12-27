#!/usr/bin/env node
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { parseFlags, validateFlags, flagsToSettings } from './cli/flags.js';
import { displaySummary, showWelcomeBanner } from './cli/output.js';
import { loadOrPromptSettings } from './cli/prompts.js';
import { executeWithSettings } from './core/executor.js';
import { CACHE_FILE } from './constants.js';
async function main() {
    // Parse flags
    const flags = parseFlags();
    // Handle --help flag
    if (flags.help) {
        const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
        yargs(hideBin(process.argv))
            .help()
            .alias('help', 'h')
            .version(pkg.version)
            .alias('version', 'v')
            .showHelp();
        process.exit(0);
    }
    // Handle --version flag
    if (flags.version) {
        const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
        console.log(pkg.version);
        process.exit(0);
    }
    // Check if we're in non-interactive mode (any flags provided)
    const isNonInteractive = Object.keys(flags).some(key => key !== 'help' && key !== 'version');
    if (isNonInteractive) {
        // Non-interactive mode: validate flags and use them
        const validation = validateFlags(flags);
        if (!validation.valid) {
            console.error(chalk.red('\n[ERROR] Invalid flags:\n'));
            validation.errors.forEach(error => {
                console.error(chalk.red(`  - ${error}`));
            });
            console.log(chalk.yellow('\nRun with --help to see usage information.\n'));
            process.exit(1);
        }
        // Convert flags to settings
        let answers = flagsToSettings(flags);
        // If --cache flag was provided, only use cache if it exists
        // If no --cache flag, useCache is already false (always rescan)
        if (answers.useCache) {
            const hasRomCache = fs.existsSync(CACHE_FILE);
            answers.useCache = hasRomCache;
        }
        // Show summary unless quiet mode
        if (!flags.quiet && !flags.json) {
            displaySummary(answers);
        }
        // Dry run mode
        if (flags.dryRun) {
            console.log(chalk.yellow('\n[INFO] Dry run mode - no changes will be made\n'));
            if (flags.json) {
                console.log(JSON.stringify({
                    status: 'dry-run',
                    settings: answers,
                    would_generate: answers.categories.length + ' collection categories',
                    would_deploy: answers.confirmDeploy
                }, null, 2));
            }
            process.exit(0);
        }
        // Proceed with non-interactive execution
        await executeWithSettings(answers, flags);
        return;
    }
    // Interactive mode (no flags provided)
    showWelcomeBanner();
    const answers = await loadOrPromptSettings();
    // Show summary once and get confirmation
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
        console.log(chalk.yellow('\n[INFO] Operation cancelled. Run the tool again to configure new settings.\n'));
        process.exit(0);
    }
    // Execute with settings (shared logic)
    await executeWithSettings(answers, {});
}
main().catch((error) => {
    console.error(chalk.red('\n[ERROR] Unhandled error:'), error);
    process.exit(1);
});
