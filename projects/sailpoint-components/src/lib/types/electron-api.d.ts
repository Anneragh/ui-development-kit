export {};

declare global {
  interface ElectronAPI {
    readConfig(): Promise<any>;
    writeConfig(config: any): Promise<void>;
    writeLogo(buffer: Uint8Array, fileName: string): Promise<void>;
    checkLogoExists(fileName: string): Promise<boolean>;
    disconnectFromISC(): Promise<void>;
  }

  interface Window {
    electronAPI: ElectronAPI;
  }
}