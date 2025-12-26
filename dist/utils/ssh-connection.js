import { MuOSClient } from './muos-client.js';
export class SSHConnection {
    client;
    constructor() {
        this.client = new MuOSClient();
    }
    async connect(config) {
        await this.client.connect(config);
    }
    async disconnect() {
        await this.client.disconnect();
    }
    async listRomsRecursively(path, progressCallback) {
        // Pass progress callback through (though SSH mode doesn't show real-time progress)
        return await this.client.listRomsRecursively(path, progressCallback);
    }
    async deployCollections(localPath, remotePath) {
        // Create remote directory
        await this.client.execCommand(`mkdir -p "${remotePath}"`);
        // Get all files in local path
        const fs = await import('fs-extra');
        const path = await import('path');
        const files = await fs.readdir(localPath);
        // Upload each file
        for (const file of files) {
            const localFilePath = path.join(localPath, file);
            const remoteFilePath = path.join(remotePath, file);
            const stat = await fs.stat(localFilePath);
            if (stat.isDirectory()) {
                // Recursively deploy subdirectories
                await this.deployCollections(localFilePath, remoteFilePath);
            }
            else {
                // Upload file
                await this.client.uploadFile(localFilePath, remoteFilePath);
            }
        }
    }
    async clearCollections(path) {
        await this.client.execCommand(`rm -rf "${path}"/*`);
    }
    // Helper method to upload a single file (for SpruceOS collections.json)
    async uploadFile(localPath, remotePath) {
        // Ensure remote directory exists
        const path = await import('path');
        const remoteDir = path.dirname(remotePath);
        await this.client.execCommand(`mkdir -p "${remoteDir}"`);
        // Upload file
        await this.client.uploadFile(localPath, remotePath);
    }
}
