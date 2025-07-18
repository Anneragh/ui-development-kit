import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

// export type UpdateEnvironmentRequest = {
//   environmentName: string;
//   tenantUrl: string;
//   baseUrl: string;
//   authType: 'oauth' | 'pat';
//   clientId?: string;
//   clientSecret?: string;
// }

// export type Tenant = {
//   active: boolean;
//   name: string;
//   apiUrl: string;
//   tenantUrl: string;
//   clientId: string | null;
//   clientSecret: string | null;
//   authType: string;
//   tenantName: string;
// }

// export type ElectronAPI = {
//   // Unified authentication and connection
//   unifiedLogin: (environment: string) => Promise<{ success: boolean, error?: string }>;
//   disconnectFromISC: () => void;
  
//   // Token management
//   refreshTokens: (environment: string) => Promise<{ success: boolean, error?: string }>;
//   getStoredOAuthTokens: (environment: string) => TokenSet | undefined;
//   getStoredPATTokens: (environment: string) => { accessToken: string, accessExpiry: Date, clientId: string, clientSecret: string } | undefined;
  
//   // Environment management
//   getTenants: () => Tenant[];
//   updateEnvironment: (config: UpdateEnvironmentRequest) => { success: boolean, error?: string };
//   deleteEnvironment: (environment: string) => { success: boolean, error?: string };
//   setActiveEnvironment: (environment: string) => { success: boolean, error?: string };
//   getGlobalAuthType: () => "oauth" | "pat";
//   setGlobalAuthType: (authType: "oauth" | "pat") => void;
  
//   // Harbor Pilot
//   harborPilotTransformChat: (chat: any) => Promise<any>;
  
//   // Config file management
//   readConfig: () => Promise<any>;
//   writeConfig: (config: any) => Promise<any>;

//   // Logo file management
//   writeLogo: (buffer: any, fileName: any) => Promise<any>;
//   checkLogoExists: (fileName: any) => Promise<any>;
//   getUserDataPath: () => Promise<any>;
//   getLogoDataUrl: (fileName: any) => Promise<any>;
// }

// declare global {
//   interface Window {
//     electronAPI: ElectronAPI;
//   }
// }

export class ElectronService {
  isElectron: boolean = false;
  electronAPI: undefined | typeof window.electronAPI;

  constructor() {
    // Setup the electronAPI
    if (window.electronAPI) {
      this.electronAPI = window.electronAPI;
      this.isElectron = true;
    } else {
      console.error('Electron API is not available');
    }
  }
}
