import { Client } from 'ssh2';
import { ROM_EXTENSIONS_FIND } from '../../constants.js';
export class SSHConnection {
    client;
    sftp = null;
    constructor() {
        this.client = new Client();
    }
    async connect(config) {
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
    async disconnect() {
        this.client.end();
    }
    async getSFTP() {
        if (this.sftp)
            return this.sftp;
        return new Promise((resolve, reject) => {
            this.client.sftp((err, sftp) => {
                if (err)
                    reject(err);
                else {
                    this.sftp = sftp;
                    resolve(sftp);
                }
            });
        });
    }
    async execCommand(command) {
        return new Promise((resolve, reject) => {
            this.client.exec(command, (err, stream) => {
                if (err)
                    return reject(err);
                let output = '';
                stream.on('data', (data) => output += data);
                stream.on('close', () => resolve(output));
                stream.stderr.on('data', (data) => console.error('STDERR:', data.toString()));
            });
        });
    }
    async uploadFile(localPath, remotePath) {
        const sftp = await this.getSFTP();
        return new Promise((resolve, reject) => {
            sftp.fastPut(localPath, remotePath, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async listRomsRecursively(basePath, progressCallback) {
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
    async deployCollections(localPath, remotePath) {
        // Create remote directory
        await this.execCommand(`mkdir -p "${remotePath}"`);
        // Deploy all files recursively
        await this.deployRecursive(localPath, remotePath);
    }
    async deployRecursive(localPath, remotePath) {
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
            }
            else {
                // Upload file
                await this.uploadFile(localFilePath, remoteFilePath);
            }
        }
    }
    async clearCollections(path) {
        await this.execCommand(`rm -rf "${path}"/*`);
    }
}
