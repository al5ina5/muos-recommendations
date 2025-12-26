import { IConnection, LocalConnectionConfig } from '../../types.js';
import { ROM_EXTENSIONS } from '../../constants.js';
import fs from 'fs-extra';
import path from 'path';

export class LocalConnection implements IConnection {
    private basePath: string;

    constructor(config: LocalConnectionConfig) {
        this.basePath = config.basePath;
        // Validate path exists
        if (!fs.existsSync(this.basePath)) {
            throw new Error(`Path does not exist: ${this.basePath}`);
        }
    }

    async connect(): Promise<void> {
        // No-op for local connection
    }

    async disconnect(): Promise<void> {
        // No-op for local connection
    }

    async listRomsRecursively(romPath: string, progressCallback?: (count: number) => void): Promise<string[]> {
        const fullPath = path.isAbsolute(romPath) ? romPath : path.join(this.basePath, romPath);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`ROMs path does not exist: ${fullPath}`);
        }

        const roms: string[] = [];

        async function walkDir(dir: string): Promise<void> {
            const entries = await fs.readdir(dir);

            for (const entry of entries) {
                const fullEntryPath = path.join(dir, entry);
                const stat = await fs.stat(fullEntryPath);

                if (stat.isDirectory()) {
                    await walkDir(fullEntryPath);
                } else if (stat.isFile()) {
                    const ext = path.extname(entry).toLowerCase().slice(1);
                    const fileName = entry.toLowerCase();
                    if (ROM_EXTENSIONS.includes(ext) || ROM_EXTENSIONS.includes(fileName)) {
                        roms.push(fullEntryPath);
                        if (progressCallback && roms.length % 100 === 0) {
                            progressCallback(roms.length);
                        }
                    }
                }
            }
        }

        await walkDir(fullPath);
        if (progressCallback) {
            progressCallback(roms.length);
        }
        return roms;
    }

    async deployCollections(localPath: string, remotePath: string): Promise<void> {
        const fullRemotePath = path.isAbsolute(remotePath) ? remotePath : path.join(this.basePath, remotePath);

        // Ensure remote directory exists
        await fs.ensureDir(fullRemotePath);

        // Copy all files from local to remote
        await this.deployRecursive(localPath, fullRemotePath);
    }

    private async deployRecursive(localPath: string, remotePath: string): Promise<void> {
        const entries = await fs.readdir(localPath);

        for (const entry of entries) {
            const localEntryPath = path.join(localPath, entry);
            const remoteEntryPath = path.join(remotePath, entry);
            const stat = await fs.stat(localEntryPath);

            if (stat.isDirectory()) {
                // Recursively copy subdirectories
                await fs.ensureDir(remoteEntryPath);
                await this.deployRecursive(localEntryPath, remoteEntryPath);
            } else {
                // Copy file
                await fs.copyFile(localEntryPath, remoteEntryPath);
            }
        }
    }

    async clearCollections(collectionPath: string): Promise<void> {
        const fullPath = path.isAbsolute(collectionPath) ? collectionPath : path.join(this.basePath, collectionPath);

        if (fs.existsSync(fullPath)) {
            await fs.emptyDir(fullPath);
        }
    }
}
