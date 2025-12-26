import { Client } from 'ssh2';
import { IConnection, SSHConfig } from '../../types.js';
import { ROM_EXTENSIONS_FIND } from '../../constants.js';

export class SSHConnection implements IConnection {
    private client: Client;
    private sftp: any = null;

    constructor() {
        this.client = new Client();
    }

    async connect(config: SSHConfig): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client
                .on('ready', resolve)
                .on('error', reject)
                .connect({
                    host: config.host,
                    port: config.port || 22,
                    username: config.username,
                    password: config.password,
                });
        });
    }

    async disconnect(): Promise<void> {
        this.client.end();
    }

    private async getSFTP(): Promise<any> {
        if (this.sftp) return this.sftp;
        return new Promise((resolve, reject) => {
            this.client.sftp((err, sftp) => {
                if (err) reject(err);
                else {
                    this.sftp = sftp;
                    resolve(sftp);
                }
            });
        });
    }

    async execCommand(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.client.exec(command, (err, stream) => {
                if (err) return reject(err);
                let output = '';
                stream.on('data', (data: any) => output += data);
                stream.on('close', () => resolve(output));
                stream.stderr.on('data', (data: any) => console.error('STDERR:', data.toString()));
            });
        });
    }

    async uploadFile(localPath: string, remotePath: string): Promise<void> {
        const sftp = await this.getSFTP();
        return new Promise((resolve, reject) => {
            sftp.fastPut(localPath, remotePath, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async listRomsRecursively(basePath: string, progressCallback?: (count: number) => void): Promise<string[]> {
        // Using find with -iname for case-insensitivity and -L to follow symlinks
        // Note: progressCallback is not used for SSH connections as progress tracking is difficult
        const nameArgs = ROM_EXTENSIONS_FIND.map(ext => `-iname "${ext}"`).join(' -o ');
        const output = await this.execCommand(`find -L "${basePath}" -type f \\( ${nameArgs} \\)`);
        const roms = output.split('\n').filter(line => line.trim() !== '');
        // Call progress callback with final count if provided
        if (progressCallback) {
            progressCallback(roms.length);
        }
        return roms;
    }

    async deployCollections(localPath: string, remotePath: string): Promise<void> {
        // Create remote directory
        await this.execCommand(`mkdir -p "${remotePath}"`);

        // Deploy all files recursively
        await this.deployRecursive(localPath, remotePath);
    }

    private async deployRecursive(localPath: string, remotePath: string): Promise<void> {
        const fs = await import('fs-extra');
        const path = await import('path');
        const files = await fs.readdir(localPath);

        for (const file of files) {
            const localFilePath = path.join(localPath, file);
            const remoteFilePath = path.join(remotePath, file);
            const stat = await fs.stat(localFilePath);

            if (stat.isDirectory()) {
                // Recursively deploy subdirectories
                await this.execCommand(`mkdir -p "${remoteFilePath}"`);
                await this.deployRecursive(localFilePath, remoteFilePath);
            } else {
                // Upload file
                await this.uploadFile(localFilePath, remoteFilePath);
            }
        }
    }

    async clearCollections(path: string): Promise<void> {
        await this.execCommand(`rm -rf "${path}"/*`);
    }
}
