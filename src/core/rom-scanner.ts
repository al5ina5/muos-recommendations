import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { IConnection } from '../types.js';
import { Settings, ParsedFlags } from '../types.js';
import { RomFile } from '../utils/matcher.js';
import { CACHE_FILE } from '../constants.js';

export async function scanRoms(connection: IConnection, settings: Settings, flags: ParsedFlags): Promise<RomFile[]> {
    let roms: string[] = [];
    
    if (settings.useCache) {
        console.log(chalk.yellow('[INFO] Using cached ROM list...\n'));
        roms = fs.readJsonSync(CACHE_FILE);
    }

    if (roms.length === 0) {
        const actionText = settings.connectionMode === 'ssh'
            ? '[INFO] Fetching ROM list from device (this may take a minute)...'
            : '[INFO] Scanning local folder for ROMs...';
        console.log(chalk.yellow(actionText));

        let progressInterval: NodeJS.Timeout | null = null;
        let lastCount = 0;

        progressInterval = setInterval(() => {
            if (lastCount > 0) {
                const mode = settings.connectionMode === 'ssh' ? 'Fetching from device...' : 'Scanning...';
                process.stdout.write(`\r${chalk.yellow(mode)} ${chalk.white(lastCount)} ROMs found`);
            }
        }, 500);

        try {
            if (settings.osType === 'spruceos' && settings.romPaths && settings.romPaths.length > 0) {
                const allRoms: string[] = [];
                for (const romPath of settings.romPaths) {
                    const pathRoms = await connection.listRomsRecursively(romPath, (count) => {
                        lastCount = count;
                    });
                    allRoms.push(...pathRoms);
                }
                roms = Array.from(new Set(allRoms));
            } else {
                roms = await connection.listRomsRecursively(settings.romPath, (count) => {
                    lastCount = count;
                });
            }
        } finally {
            if (progressInterval) {
                clearInterval(progressInterval);
                process.stdout.write('\r');
            }
        }

        fs.writeJsonSync(CACHE_FILE, roms);
        console.log(chalk.green(`\n[SUCCESS] Found ${roms.length} ROMs and cached them.`));
    } else {
        console.log(chalk.green(`[SUCCESS] Using ${roms.length} cached ROMs`));
    }

    // Process ROMs for the matcher
    const romFiles: RomFile[] = roms
        .filter(r => {
            if (path.basename(r).startsWith('._')) return false;

            const fileName = path.basename(r);
            const ext = path.extname(fileName).toLowerCase();
            const lowerPath = r.toLowerCase();

            if (ext === '.png' && !fileName.toLowerCase().endsWith('.p8.png')) {
                return false;
            }

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

    return romFiles;
}

