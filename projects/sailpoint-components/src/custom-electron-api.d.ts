interface ElectronAPI {
  readConfig(): Promise<any>;
  writeConfig(config: any): Promise<void>;
  writeLogo(buffer: Uint8Array, fileName: string): Promise<void>;
  checkLogoExists(fileName: string): Promise<boolean>;
}

interface Window {
  electronAPI: ElectronAPI;
}