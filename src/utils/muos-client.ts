import { Client } from 'ssh2';
import fs from 'fs-extra';
import path from 'path';

export interface SSHConfig {
    host: string;
    port?: number;
    username: string;
    password?: string;
}

export class MuOSClient {
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

    async downloadFile(remotePath: string, localPath: string): Promise<void> {
        const sftp = await this.getSFTP();
        return new Promise((resolve, reject) => {
            sftp.fastGet(remotePath, localPath, (err) => {
                if (err) reject(err);
                else resolve();
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

    async listRomsRecursively(basePath: string): Promise<string[]> {
        // Using find with -iname for case-insensitivity and -L to follow symlinks
        // Expanded extension list to include more common retro formats
        const extensions = [
            '*.gba', '*.gbc', '*.gb',
            '*.sfc', '*.smc', '*.smk', '*.snes',
            '*.nes', '*.fc',
            '*.md', '*.gen', '*.bin', '*.smd',
            '*.cue', '*.chd', '*.pbp', '*.iso', '*.img',
            '*.zip', '*.7z',
            '*.sh', '*.port', '*.png', '*.m3u', '*.scummvm', '*.p8', '*.p8.png'
        ];
        const nameArgs = extensions.map(ext => `-iname "${ext}"`).join(' -o ');
        const output = await this.execCommand(`find -L "${basePath}" -type f \\( ${nameArgs} \\)`);
        return output.split('\n').filter(line => line.trim() !== '');
    }

    async disconnect(): Promise<void> {
        this.client.end();
    }
}
