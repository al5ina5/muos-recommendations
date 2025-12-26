import { Client } from 'ssh2';
export class MuOSClient {
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
    async downloadFile(remotePath, localPath) {
        const sftp = await this.getSFTP();
        return new Promise((resolve, reject) => {
            sftp.fastGet(remotePath, localPath, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
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
        // Expanded extension list to include more common retro formats
        // Note: progressCallback is not used for SSH connections as progress tracking is difficult
        const extensions = [
            '*.gba', '*.gbc', '*.gb',
            '*.sfc', '*.smc', '*.smk', '*.snes',
            '*.nes', '*.fc',
            '*.md', '*.gen', '*.bin', '*.smd',
            '*.cue', '*.chd', '*.pbp', '*.iso', '*.img',
            '*.nds', '*.ds',
            '*.zip', '*.7z',
            '*.sh', '*.port', '*.png', '*.m3u', '*.scummvm', '*.p8', '*.p8.png'
        ];
        const nameArgs = extensions.map(ext => `-iname "${ext}"`).join(' -o ');
        const output = await this.execCommand(`find -L "${basePath}" -type f \\( ${nameArgs} \\)`);
        const roms = output.split('\n').filter(line => line.trim() !== '');
        // Call progress callback with final count if provided
        if (progressCallback) {
            progressCallback(roms.length);
        }
        return roms;
    }
    async disconnect() {
        this.client.end();
    }
}
