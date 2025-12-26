import chalk from 'chalk';
import { Settings, ParsedFlags, IConnection, SSHConfig } from '../types.js';
import { SSHConnection } from '../utils/connections/ssh.js';
import { LocalConnection } from '../utils/connections/local.js';

export async function createConnection(settings: Settings, flags: ParsedFlags): Promise<IConnection> {
    if (settings.connectionMode === 'ssh') {
        const connection = new SSHConnection();
        try {
            if (!flags.quiet) {
                console.log(chalk.yellow('\n[INFO] Connecting to device...'));
            }
            const sshConfig: SSHConfig = settings.osType === 'spruceos'
                ? { host: settings.ip!, username: 'spruce', password: 'happygaming' }
                : { host: settings.ip!, username: 'root', password: 'root' };
            await connection.connect(sshConfig);
            console.log(chalk.green('[SUCCESS] Connected!\n'));
            return connection;
        } catch (error: any) {
            console.error(chalk.red('\n[ERROR] Failed to connect to device'));
            console.error(chalk.red(`        Error: ${error.message}\n`));
            console.log(chalk.yellow('[INFO] Troubleshooting steps:'));
            console.log(chalk.white('       1. Verify the IP address is correct'));
            console.log(chalk.white('       2. Ensure SSH is enabled on your device'));
            console.log(chalk.white('       3. Check that your computer and device are on the same Wi-Fi network'));
            console.log(chalk.white('       4. Try connecting manually: ssh ' + (settings.osType === 'spruceos' ? 'spruce' : 'root') + '@' + settings.ip));
            console.log(chalk.white('       5. Default credentials: ' + (settings.osType === 'spruceos' ? 'spruce/happygaming' : 'root/root') + '\n'));
            process.exit(1);
        }
    } else {
        const connection = new LocalConnection({ basePath: settings.localPath! });
        try {
            await connection.connect();
            console.log(chalk.green('[SUCCESS] Local folder connection ready!\n'));
            return connection;
        } catch (error: any) {
            console.error(chalk.red('\n[ERROR] Failed to access local folder'));
            console.error(chalk.red(`        Error: ${error.message}\n`));
            console.log(chalk.yellow('[INFO] Troubleshooting steps:'));
            console.log(chalk.white('       1. Verify the folder path exists: ' + settings.localPath));
            console.log(chalk.white('       2. Check that you have read/write permissions'));
            console.log(chalk.white('       3. Ensure the SD card is properly mounted (if using SD card)'));
            console.log(chalk.white('       4. Try using an absolute path instead of relative path\n'));
            process.exit(1);
        }
    }
}

