import fs from 'fs-extra';
import path from 'path';
export class LocalConnection {
    basePath;
    constructor(config) {
        this.basePath = config.basePath;
        // Validate path exists
        if (!fs.existsSync(this.basePath)) {
            throw new Error(`Path does not exist: ${this.basePath}`);
        }
    }
    async connect() {
        // No-op for local connection
    }
    async disconnect() {
        // No-op for local connection
    }
    async listRomsRecursively(romPath, progressCallback) {
        const fullPath = path.isAbsolute(romPath) ? romPath : path.join(this.basePath, romPath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`ROMs path does not exist: ${fullPath}`);
        }
        const extensions = [
            'gba', 'gbc', 'gb',
            'sfc', 'smc', 'smk', 'snes',
            'nes', 'fc',
            'md', 'gen', 'bin', 'smd',
            'cue', 'chd', 'pbp', 'iso', 'img',
            'nds', 'ds',
            'zip', '7z',
            'sh', 'port', 'png', 'm3u', 'scummvm', 'p8', 'p8.png'
        ];
        const roms = [];
        async function walkDir(dir) {
            const entries = await fs.readdir(dir);
            for (const entry of entries) {
                const fullEntryPath = path.join(dir, entry);
                const stat = await fs.stat(fullEntryPath);
                if (stat.isDirectory()) {
                    await walkDir(fullEntryPath);
                }
                else if (stat.isFile()) {
                    const ext = path.extname(entry).toLowerCase().slice(1);
                    if (extensions.includes(ext) || extensions.includes(entry.toLowerCase())) {
                        roms.push(fullEntryPath);
                        if (progressCallback && roms.length % 100 === 0) {
                            progressCallback(roms.length);
                        }
                    }
                }
            }
        }
        await walkDir(fullPath);
        return roms;
    }
    async deployCollections(localPath, remotePath) {
        const fullRemotePath = path.isAbsolute(remotePath) ? remotePath : path.join(this.basePath, remotePath);
        // Ensure remote directory exists
        await fs.ensureDir(fullRemotePath);
        // Copy all files from local to remote
        const entries = await fs.readdir(localPath);
        for (const entry of entries) {
            const localEntryPath = path.join(localPath, entry);
            const remoteEntryPath = path.join(fullRemotePath, entry);
            const stat = await fs.stat(localEntryPath);
            if (stat.isDirectory()) {
                // Recursively copy subdirectories
                await this.deployCollections(localEntryPath, remoteEntryPath);
            }
            else {
                // Copy file
                await fs.copyFile(localEntryPath, remoteEntryPath);
            }
        }
    }
    async clearCollections(collectionPath) {
        const fullPath = path.isAbsolute(collectionPath) ? collectionPath : path.join(this.basePath, collectionPath);
        if (fs.existsSync(fullPath)) {
            await fs.emptyDir(fullPath);
        }
    }
}
