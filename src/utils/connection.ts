export interface IConnection {
    connect(config?: any): Promise<void>;
    disconnect(): Promise<void>;
    listRomsRecursively(path: string, progressCallback?: (count: number) => void): Promise<string[]>;
    deployCollections(localPath: string, remotePath: string): Promise<void>;
    clearCollections(path: string): Promise<void>;
    uploadFile?(localPath: string, remotePath: string): Promise<void>;
}



