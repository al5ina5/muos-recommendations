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
    async listRomsRecursively(basePath) {
        // Using find to get all files recursively
        const output = await this.execCommand(`find "${basePath}" -type f \\( -name "*.gba" -o -name "*.sfc" -o -name "*.nes" -o -name "*.md" -o -name "*.gen" -o -name "*.cue" -o -name "*.chd" -o -name "*.pbp" \\)`);
        return output.split('\n').filter(line => line.trim() !== '');
    }
    async disconnect() {
        this.client.end();
    }
}
