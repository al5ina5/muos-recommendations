import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import { ParsedFlags, Settings } from '../types.js';

export function parseFlags(): ParsedFlags {
    const argv = yargs(hideBin(process.argv))
        .option('os', {
            alias: 'o',
            type: 'string',
            choices: ['muos', 'spruceos'],
            description: 'Device OS type'
        })
        .option('ip', {
            alias: 'i',
            type: 'string',
            description: 'Device IP (SSH mode - if provided, uses SSH; otherwise uses local mode)'
        })
        .option('roms-path', {
            type: 'string',
            description: 'ROMs path(s) (comma-separated, absolute paths)'
        })
        .option('collections-path', {
            alias: 'c',
            type: 'string',
            description: 'Collections output path'
        })
        .option('categories', {
            type: 'string',
            description: 'Comma-separated categories'
        })
        .option('missing-roms', {
            type: 'string',
            choices: ['mark', 'omit'],
            description: 'How to handle missing ROMs'
        })
        .option('numbers', {
            alias: 'n',
            type: 'boolean',
            description: 'Display numbers'
        })
        .option('no-numbers', {
            type: 'boolean',
            description: 'Disable numbers'
        })
        .option('deploy', {
            alias: 'd',
            type: 'boolean',
            description: 'Auto deploy'
        })
        .option('no-deploy', {
            type: 'boolean',
            description: 'Skip deployment'
        })
        .option('clear-existing', {
            type: 'boolean',
            description: 'Clear existing collections'
        })
        .option('cache', {
            type: 'boolean',
            description: 'Use cached ROM list (default: always rescan)'
        })
        .option('quiet', {
            alias: 'q',
            type: 'boolean',
            description: 'Minimal output'
        })
        .option('json', {
            type: 'boolean',
            description: 'JSON output format'
        })
        .option('dry-run', {
            type: 'boolean',
            description: 'Validate and show what would happen'
        })
        .help(false)
        .version(false)
        .parseSync();

    const flags: ParsedFlags = {};

    // Convert yargs result to ParsedFlags
    // Mode will be inferred later from --ip presence in flagsToSettings()
    if (argv.ip) flags.ip = argv.ip;
    if (argv.os) flags.os = argv.os as 'muos' | 'spruceos';
    if (argv['roms-path']) {
        const paths = argv['roms-path'].split(',').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
        flags.romPath = paths[0];
        if (paths.length > 1) {
            flags.romPaths = paths;
        }
    }
    if (argv['collections-path']) flags.collectionPath = argv['collections-path'];
    if (argv.categories) {
        flags.categories = argv.categories.split(',').map(c => c.trim()).filter(c => c.length > 0);
    }
    if (argv['missing-roms']) flags.missingRoms = argv['missing-roms'] as 'mark' | 'omit';
    if (argv.numbers !== undefined) flags.numbers = argv.numbers;
    if (argv['no-numbers']) flags.numbers = false;
    if (argv.deploy !== undefined) flags.deploy = argv.deploy;
    if (argv['no-deploy']) flags.deploy = false;
    if (argv['clear-existing']) flags.clearExisting = argv['clear-existing'];
    if (argv.cache !== undefined) flags.useCache = argv.cache;
    if (argv.quiet) flags.quiet = argv.quiet;
    if (argv.json) flags.json = argv.json;
    if (argv['dry-run']) flags.dryRun = argv['dry-run'];
    if (argv.help) flags.help = true;
    if (argv.version) flags.version = true;

    return flags;
}

export function validateFlags(flags: ParsedFlags): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if any flags provided (non-interactive mode)
    const hasFlags = Object.keys(flags).some(key => key !== 'help' && key !== 'version');

    if (!hasFlags) {
        return { valid: true, errors: [] }; // Interactive mode, no validation needed
    }

    // Non-interactive mode validation
    // Mode is inferred from --ip presence: if provided, SSH mode; otherwise, local mode
    if (!flags.os) {
        errors.push('Missing required flag: --os (muos or spruceos)');
    } else if (flags.os !== 'muos' && flags.os !== 'spruceos') {
        errors.push(`Invalid value for --os: '${flags.os}'. Must be 'muos' or 'spruceos'`);
    }

    if (flags.missingRoms && flags.missingRoms !== 'mark' && flags.missingRoms !== 'omit') {
        errors.push(`Invalid value for --missing-roms: '${flags.missingRoms}'. Must be 'mark' or 'omit'`);
    }

    // SpruceOS requires omit for missing ROMs
    if (flags.os === 'spruceos' && flags.missingRoms === 'mark') {
        errors.push('SpruceOS does not support marking missing ROMs. Use --missing-roms=omit');
    }

    return { valid: errors.length === 0, errors };
}

export function flagsToSettings(flags: ParsedFlags): Settings {
    // Default values
    const defaultCategories = ['Essentials', 'Franchises', 'Special'];
    const defaultMissingRoms = flags.os === 'spruceos' ? 'omit' : 'mark';

    // Infer mode from IP presence: if IP provided, SSH mode; otherwise, local mode
    const connectionMode: 'ssh' | 'local' = flags.ip ? 'ssh' : 'local';

    // OS-based default paths
    let defaultRomPath: string;
    let defaultRomPaths: string[] | undefined;
    let defaultCollectionPath: string;

    if (flags.os === 'spruceos') {
        defaultRomPaths = connectionMode === 'ssh'
            ? ['/mnt/sdcard/Roms', '/media/sdcard1/Roms']
            : ['/Volumes/SDCARD/Roms', '/Volumes/SDCARD/media/sdcard1/Roms'];
        defaultRomPath = defaultRomPaths[0];
        defaultCollectionPath = connectionMode === 'ssh'
            ? '/mnt/sdcard/Collections'
            : '/Volumes/SDCARD/Collections';
    } else {
        // muOS
        defaultRomPath = connectionMode === 'ssh'
            ? '/mnt/sdcard/ROMS'
            : '/Volumes/SDCARD/ROMS';
        defaultCollectionPath = connectionMode === 'ssh'
            ? '/mnt/mmc/MUOS/info/collection'
            : '/Volumes/SDCARD/MUOS/info/collection';
    }

    // Use provided paths or defaults
    const romPath = flags.romPath || defaultRomPath;
    const romPaths = flags.romPaths || (flags.os === 'spruceos' ? defaultRomPaths : undefined);
    const collectionPath = flags.collectionPath || defaultCollectionPath;

    // Derive localPath from roms path for local mode (common parent directory)
    let localPath: string | undefined;
    if (connectionMode === 'local') {
        const firstRomPath = romPath;
        if (firstRomPath) {
            localPath = path.dirname(firstRomPath);
        }
    }

    const settings: Settings = {
        connectionMode: connectionMode,
        osType: flags.os!,
        ip: flags.ip,
        localPath: localPath,
        romPath: romPath,
        romPaths: romPaths,
        collectionPath: collectionPath,
        useCache: flags.useCache !== undefined ? flags.useCache : false,
        categories: flags.categories || defaultCategories,
        missingHandle: flags.missingRoms || defaultMissingRoms,
        useNumbers: flags.numbers !== undefined ? flags.numbers : true,
        confirmDeploy: flags.deploy !== undefined ? flags.deploy : true,
        clearExisting: flags.clearExisting || false,
    };

    return settings;
}
