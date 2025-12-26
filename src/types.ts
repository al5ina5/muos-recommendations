// CLI Types
export interface ParsedFlags {
    mode?: 'ssh' | 'local';
    os?: 'muos' | 'spruceos';
    ip?: string;
    localPath?: string;
    romPath?: string;
    romPaths?: string[];
    collectionPath?: string;
    categories?: string[];
    missingRoms?: 'mark' | 'omit';
    numbers?: boolean;
    deploy?: boolean;
    clearExisting?: boolean;
    useCache?: boolean;
    clearCache?: boolean;
    help?: boolean;
    version?: boolean;
    quiet?: boolean;
    json?: boolean;
    dryRun?: boolean;
}

export interface Settings {
    connectionMode: 'ssh' | 'local';
    osType: 'muos' | 'spruceos';
    ip?: string;  // Only for SSH
    localPath?: string;  // Only for local mode
    romPath: string;  // For muOS (single path)
    romPaths?: string[];  // For SpruceOS (multiple paths)
    collectionPath: string;
    useCache: boolean;
    categories: string[];
    missingHandle: 'mark' | 'omit';
    useNumbers: boolean;
    confirmDeploy: boolean;
    clearExisting: boolean;
}

// Connection Types
export interface IConnection {
    connect(config?: any): Promise<void>;
    disconnect(): Promise<void>;
    listRomsRecursively(path: string, progressCallback?: (count: number) => void): Promise<string[]>;
    deployCollections(localPath: string, remotePath: string): Promise<void>;
    clearCollections(path: string): Promise<void>;
    uploadFile?(localPath: string, remotePath: string): Promise<void>;  // Optional, mainly for SpruceOS
}

export interface SSHConfig {
    host: string;
    port?: number;
    username: string;
    password?: string;
}

export interface LocalConnectionConfig {
    basePath: string;
}

// Formatter Types
// Note: Recommendation and RomFile are imported in files that use these types
export interface FormatGameOptions {
    useNumbers: boolean;
    index: number;
    missingHandle: 'mark' | 'omit';
}

export interface ICollectionFormatter {
    formatGame(game: any, match: any, options: FormatGameOptions, relativePath?: string): string;
    getFileExtension(): string;
    getCollectionPath(basePath: string, collectionTitle: string, system?: string): string;
    getSystemId(system: string): string;
}

// SpruceOS-specific types
export interface SpruceOSGameEntry {
    rom_file_path: string;
    game_system_name: string;
}

export interface SpruceOSCollection {
    collection_name: string;
    game_list: SpruceOSGameEntry[];
}

