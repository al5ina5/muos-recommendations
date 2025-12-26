import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
export function parseFlags() {
    const argv = yargs(hideBin(process.argv))
        .option('mode', {
        alias: 'm',
        type: 'string',
        choices: ['ssh', 'local'],
        description: 'Connection mode'
    })
        .option('os', {
        alias: 'o',
        type: 'string',
        choices: ['muos', 'spruceos'],
        description: 'Device OS type'
    })
        .option('ip', {
        alias: 'i',
        type: 'string',
        description: 'Device IP (SSH mode only)'
    })
        .option('local-path', {
        alias: 'l',
        type: 'string',
        description: 'Local folder path (local mode only)'
    })
        .option('rom-path', {
        type: 'string',
        description: 'ROM path (muOS)'
    })
        .option('rom-paths', {
        type: 'string',
        description: 'ROM paths (SpruceOS, comma-separated)'
    })
        .option('collection-path', {
        alias: 'c',
        type: 'string',
        description: 'Collection output path'
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
        .option('use-cache', {
        type: 'boolean',
        description: 'Use cached ROM list'
    })
        .option('no-use-cache', {
        type: 'boolean',
        description: 'Force fresh ROM scan'
    })
        .option('clear-cache', {
        type: 'boolean',
        description: 'Clear ROM cache before running'
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
    const flags = {};
    // Convert yargs result to ParsedFlags
    if (argv.mode)
        flags.mode = argv.mode;
    if (argv.os)
        flags.os = argv.os;
    if (argv.ip)
        flags.ip = argv.ip;
    if (argv['local-path'])
        flags.localPath = argv['local-path'];
    if (argv['rom-path'])
        flags.romPath = argv['rom-path'];
    if (argv['rom-paths']) {
        flags.romPaths = argv['rom-paths'].split(',').map(p => p.trim()).filter(p => p.length > 0);
    }
    if (argv['collection-path'])
        flags.collectionPath = argv['collection-path'];
    if (argv.categories) {
        flags.categories = argv.categories.split(',').map(c => c.trim()).filter(c => c.length > 0);
    }
    if (argv['missing-roms'])
        flags.missingRoms = argv['missing-roms'];
    if (argv.numbers !== undefined)
        flags.numbers = argv.numbers;
    if (argv['no-numbers'])
        flags.numbers = false;
    if (argv.deploy !== undefined)
        flags.deploy = argv.deploy;
    if (argv['no-deploy'])
        flags.deploy = false;
    if (argv['clear-existing'])
        flags.clearExisting = argv['clear-existing'];
    if (argv['use-cache'] !== undefined)
        flags.useCache = argv['use-cache'];
    if (argv['no-use-cache'])
        flags.useCache = false;
    if (argv['clear-cache'])
        flags.clearCache = argv['clear-cache'];
    if (argv.quiet)
        flags.quiet = argv.quiet;
    if (argv.json)
        flags.json = argv.json;
    if (argv['dry-run'])
        flags.dryRun = argv['dry-run'];
    if (argv.help)
        flags.help = true;
    if (argv.version)
        flags.version = true;
    return flags;
}
export function validateFlags(flags) {
    const errors = [];
    // Check if any flags provided (non-interactive mode)
    const hasFlags = Object.keys(flags).some(key => key !== 'help' && key !== 'version');
    if (!hasFlags) {
        return { valid: true, errors: [] }; // Interactive mode, no validation needed
    }
    // Non-interactive mode validation
    if (!flags.mode) {
        errors.push('Missing required flag: --mode (ssh or local)');
    }
    else if (flags.mode !== 'ssh' && flags.mode !== 'local') {
        errors.push(`Invalid value for --mode: '${flags.mode}'. Must be 'ssh' or 'local'`);
    }
    if (!flags.os) {
        errors.push('Missing required flag: --os (muos or spruceos)');
    }
    else if (flags.os !== 'muos' && flags.os !== 'spruceos') {
        errors.push(`Invalid value for --os: '${flags.os}'. Must be 'muos' or 'spruceos'`);
    }
    if (flags.mode === 'ssh' && !flags.ip) {
        errors.push('Missing required flag: --ip (required for SSH mode)');
    }
    if (flags.mode === 'local' && !flags.localPath) {
        errors.push('Missing required flag: --local-path (required for local mode)');
    }
    if (flags.os === 'muos' && !flags.romPath) {
        errors.push('Missing required flag: --rom-path (required for muOS)');
    }
    if (flags.os === 'spruceos' && !flags.romPaths && !flags.romPath) {
        errors.push('Missing required flag: --rom-paths or --rom-path (required for SpruceOS)');
    }
    if (!flags.collectionPath) {
        errors.push('Missing required flag: --collection-path');
    }
    // Validate conflicting flags
    if (flags.mode === 'ssh' && flags.localPath) {
        errors.push('--local-path is only valid with --mode=local. Use --ip for SSH mode.');
    }
    if (flags.mode === 'local' && flags.ip) {
        errors.push('--ip is only valid with --mode=ssh. Use --local-path for local mode.');
    }
    if (flags.os === 'muos' && flags.romPaths) {
        errors.push('--rom-paths is only valid with --os=spruceos. Use --rom-path for muOS.');
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
export function flagsToSettings(flags) {
    // Default values
    const defaultCategories = ['Essentials', 'Franchises', 'Special'];
    const defaultMissingRoms = flags.os === 'spruceos' ? 'omit' : 'mark';
    const settings = {
        connectionMode: flags.mode,
        osType: flags.os,
        ip: flags.ip,
        localPath: flags.localPath,
        romPath: flags.romPath || (flags.romPaths ? flags.romPaths[0] : ''),
        romPaths: flags.romPaths,
        collectionPath: flags.collectionPath,
        useCache: flags.useCache !== undefined ? flags.useCache : true,
        categories: flags.categories || defaultCategories,
        missingHandle: flags.missingRoms || defaultMissingRoms,
        useNumbers: flags.numbers !== undefined ? flags.numbers : true,
        confirmDeploy: flags.deploy !== undefined ? flags.deploy : true,
        clearExisting: flags.clearExisting || false,
    };
    return settings;
}
