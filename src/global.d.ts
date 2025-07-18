export type UpdateEnvironmentRequest = {
  environmentName: string;
  tenantUrl: string;
  baseUrl: string;
  authType: 'oauth' | 'pat';
  clientId?: string;
  clientSecret?: string;
}

export type Tenant = {
  active: boolean;
  name: string;
  apiUrl: string;
  tenantUrl: string;
  clientId: string | null;
  clientSecret: string | null;
  authType: "oauth" | "pat";
  tenantName: string;
}

export type TokenSet = {
  accessToken: string;
  accessExpiry: Date;
  refreshToken: string;
  refreshExpiry: Date;
}

declare global {
  interface Window {
    electronAPI: {
      // Unified authentication and connection
      unifiedLogin: (environment: string) => Promise<{ success: boolean, error?: string }>;
      disconnectFromISC: () => Promise<void>;
      
      // Token management
      refreshTokens: (environment: string) => Promise<{ success: boolean, error?: string }>;
      getStoredOAuthTokens: (environment: string) => Promise<TokenSet | undefined>;
      getStoredPATTokens: (environment: string) => Promise<{ accessToken: string, accessExpiry: Date, clientId: string, clientSecret: string } | undefined>;
      validateTokens: (environment: string) => Promise<{ isValid: boolean, needsRefresh: boolean, error?: string }>;
      storeClientCredentials: (environment: string, clientId: string, clientSecret: string) => Promise<void>;
      
      // Environment management
      getTenants: () => Promise<Tenant[]>;
      updateEnvironment: (config: UpdateEnvironmentRequest) => Promise<{ success: boolean, error?: string }>;
      deleteEnvironment: (environment: string) => Promise<{ success: boolean, error?: string }>;
      setActiveEnvironment: (environment: string) => Promise<{ success: boolean, error?: string }>;
      getGlobalAuthType: () => Promise<"oauth" | "pat">;
      setGlobalAuthType: (authType: "oauth" | "pat") => Promise<void>;
      
      // Harbor Pilot
      harborPilotTransformChat: (chat: any) => Promise<any>;
      
      // Config file management
      readConfig: () => Promise<any>;
      writeConfig: (config: any) => Promise<any>;
    
      // Logo file management
      writeLogo: (buffer: any, fileName: any) => Promise<any>;
      checkLogoExists: (fileName: any) => Promise<any>;
      getUserDataPath: () => Promise<any>;
      getLogoDataUrl: (fileName: any) => Promise<any>;
    };
  }
}
