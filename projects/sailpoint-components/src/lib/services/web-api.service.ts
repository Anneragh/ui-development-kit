import { Injectable } from '@angular/core';
import { PATTokenSet } from 'src/global';

/**
 * Interface that defines all the methods used from window.electronAPI
 * This acts as a contract for implementing web-compatible alternatives
 */
export interface ElectronAPIInterface {
  // Unified authentication and connection
  unifiedLogin: (
    environment: string
  ) => Promise<{ success: boolean; error?: string }>;
  disconnectFromISC: () => Promise<void>;
  checkAccessTokenStatus: (environment: string) => Promise<AccessTokenStatus>;
  checkRefreshTokenStatus: (environment: string) => Promise<RefreshTokenStatus>;
  getCurrentTokenDetails: (
    environment: string
  ) => Promise<{ tokenDetails: TokenDetails | undefined; error?: string }>;

  // Token management
  refreshTokens: (
    environment: string
  ) => Promise<{ success: boolean; error?: string }>;
  getStoredOAuthTokens: (environment: string) => Promise<TokenSet | undefined>;
  getStoredPATTokens: (environment: string) => Promise<PATTokenSet | undefined>;
  validateTokens: (
    environment: string
  ) => Promise<{ isValid: boolean; needsRefresh: boolean; error?: string }>;
  storeClientCredentials: (
    environment: string,
    clientId: string,
    clientSecret: string
  ) => Promise<void>;

  // Environment management
  getTenants: () => Promise<Tenant[]>;
  updateEnvironment: (
    config: UpdateEnvironmentRequest
  ) => Promise<{ success: boolean; error?: string }>;
  deleteEnvironment: (
    environment: string
  ) => Promise<{ success: boolean; error?: string }>;
  setActiveEnvironment: (
    environment: string
  ) => Promise<{ success: boolean; error?: string }>;
  getGlobalAuthType: () => Promise<AuthMethods>;
  setGlobalAuthType: (authType: AuthMethods) => Promise<void>;

  // Config file management
  readConfig: () => Promise<any>;
  writeConfig: (config: any) => Promise<any>;

  // Logo file management
  writeLogo: (
    buffer: Uint8Array<ArrayBufferLike>,
    fileName: string
  ) => Promise<any>;
  checkLogoExists: (fileName: string) => Promise<any>;
  getUserDataPath: () => Promise<any>;
  getLogoDataUrl: (fileName: string) => Promise<any>;

  // SailPoint SDK functions
  // These are dynamically added and would need to be proxied through the web service
  [key: string]: any;
}

// Supporting Types
export type AuthMethods = 'oauth' | 'pat';

export type UpdateEnvironmentRequest = {
  environmentName: string;
  tenantUrl: string;
  baseUrl: string;
  authType: AuthMethods;
  clientId?: string;
  clientSecret?: string;
  openAIApiKey?: string;
};

export type Tenant = {
  active: boolean;
  name: string;
  apiUrl: string;
  tenantUrl: string;
  clientId?: string;
  clientSecret?: string;
  openAIApiKey?: string;
  authType: AuthMethods;
  tenantName: string;
};

export type TokenSet = {
  accessToken: string;
  accessExpiry: Date;
  refreshToken: string;
  refreshExpiry: Date;
};

export type AccessTokenStatus = {
  authType: AuthMethods;
  accessTokenIsValid: boolean;
  expiry?: Date;
  needsRefresh: boolean;
};

export type RefreshTokenStatus = {
  authType: 'oauth';
  refreshTokenIsValid: boolean;
  expiry?: Date;
  needsRefresh: boolean;
};

export type AuthPayload = {
  tenant_id: string;
  pod: string;
  org: string;
  identity_id: string;
  user_name: string;
  strong_auth: boolean;
  authorities: string[];
  client_id: string;
  strong_auth_supported: boolean;
  scope: string[];
  exp: number;
  jti: string;
};

export type TokenDetails = {
  expiry: Date;
} & AuthPayload;

@Injectable({
  providedIn: 'root',
})
export class WebApiService implements ElectronAPIInterface {
  private apiUrl = '/api'; // Default API URL, can be configured
  private tenants: Tenant[] = [];
  private authType: AuthMethods = 'pat';
  private activeEnvironment: string | null = null;
  private tokens: Map<string, TokenSet> = new Map();

  constructor() {}

  /**
   * Configure the API URL for the web service
   * @param url - The base URL for the web service API
   */
  setApiUrl(url: string): void {
    this.apiUrl = url;
  }

  /**
   * Helper method to make API calls to the web service
   */
  private async apiCall<T>(
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.apiUrl}/${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Includes cookies for session management
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API call failed: ${error}`);
    }

    return (await response.json()) as T;
  }

  // Authentication and Connection methods
  async unifiedLogin(
    environment: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.apiCall<{ success: boolean; error?: string }>(
        'auth/login',
        'POST',
        { environment }
      );
      if (result.success) {
        this.activeEnvironment = environment;
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error during login',
      };
    }
  }

  async disconnectFromISC(): Promise<void> {
    await this.apiCall('auth/logout', 'POST');
    this.activeEnvironment = null;
  }

  async checkAccessTokenStatus(
    environment: string
  ): Promise<AccessTokenStatus> {
    return this.apiCall<AccessTokenStatus>(
      `auth/status/access/${environment}`,
      'GET'
    );
  }

  async checkRefreshTokenStatus(
    environment: string
  ): Promise<RefreshTokenStatus> {
    return this.apiCall<RefreshTokenStatus>(
      `auth/status/refresh/${environment}`,
      'GET'
    );
  }

  async getCurrentTokenDetails(
    environment: string
  ): Promise<{ tokenDetails: TokenDetails | undefined; error?: string }> {
    return this.apiCall<{
      tokenDetails: TokenDetails | undefined;
      error?: string;
    }>(`auth/token-details/${environment}`, 'GET');
  }

  // Token Management methods
  async refreshTokens(
    environment: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.apiCall<{ success: boolean; error?: string }>(
      `auth/refresh`,
      'POST',
      { environment }
    );
  }

  async getStoredOAuthTokens(
    environment: string
  ): Promise<TokenSet | undefined> {
    try {
      return await this.apiCall<TokenSet | undefined>(
        `auth/oauth-tokens/${environment}`,
        'GET'
      );
    } catch (error) {
      console.error('Error getting OAuth tokens:', error);
      return undefined;
    }
  }

  async getStoredPATTokens(
    environment: string
  ): Promise<PATTokenSet | undefined> {
    try {
      const result = await this.apiCall<PATTokenSet>(
        `auth/pat-tokens/${environment}`,
        'GET'
      );
      if (result) {
        // Convert string dates to Date objects
        result.accessExpiry = new Date(result.accessExpiry);

        return result;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting PAT tokens:', error);
      return undefined;
    }
  }

  async validateTokens(
    environment: string
  ): Promise<{ isValid: boolean; needsRefresh: boolean; error?: string }> {
    return this.apiCall<{
      isValid: boolean;
      needsRefresh: boolean;
      error?: string;
    }>(`auth/validate-tokens/${environment}`, 'GET');
  }

  async storeClientCredentials(
    environment: string,
    clientId: string,
    clientSecret: string
  ): Promise<void> {
    await this.apiCall('auth/store-credentials', 'POST', {
      environment,
      clientId,
      clientSecret,
    });
  }

  // Environment Management methods
  async getTenants(): Promise<Tenant[]> {
    this.tenants = await this.apiCall<Tenant[]>('environments', 'GET');
    return this.tenants;
  }

  async updateEnvironment(
    config: UpdateEnvironmentRequest
  ): Promise<{ success: boolean; error?: string }> {
    return this.apiCall<{ success: boolean; error?: string }>(
      'environments',
      'POST',
      config
    );
  }

  async deleteEnvironment(
    environment: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.apiCall<{ success: boolean; error?: string }>(
      `environments/${encodeURIComponent(environment)}`,
      'DELETE'
    );
  }

  async setActiveEnvironment(
    environment: string
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.apiCall<{ success: boolean; error?: string }>(
      'environments/active',
      'POST',
      { environment }
    );
    if (result.success) {
      this.activeEnvironment = environment;
    }
    return result;
  }

  async getGlobalAuthType(): Promise<AuthMethods> {
    const result = await this.apiCall<{ authType: AuthMethods }>(
      'auth/global-type',
      'GET'
    );
    this.authType = result.authType;
    return this.authType;
  }

  async setGlobalAuthType(authType: AuthMethods): Promise<void> {
    await this.apiCall('auth/global-type', 'POST', { authType });
    this.authType = authType;
  }

  // Config Management methods
  async readConfig(): Promise<any> {
    return this.apiCall('config', 'GET');
  }

  async writeConfig(config: any): Promise<any> {
    return this.apiCall('config', 'POST', { config });
  }

  // Logo Management methods
  async writeLogo(
    buffer: Uint8Array<ArrayBufferLike>,
    fileName: string
  ): Promise<any> {
    const formData = new FormData();
    // Convert buffer to Blob
    const blob = new Blob([buffer], { type: 'application/octet-stream' });

    formData.append('logo', blob, fileName);

    const response = await fetch(`${this.apiUrl}/logos`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upload logo: ${error}`);
    }

    return response.json();
  }

  async checkLogoExists(fileName: string): Promise<any> {
    return this.apiCall<boolean>(
      `logos/${encodeURIComponent(fileName)}/exists`,
      'GET'
    );
  }

  async getUserDataPath(): Promise<any> {
    return this.apiCall<string>('user-data-path', 'GET');
  }

  async getLogoDataUrl(fileName: string): Promise<any> {
    return this.apiCall<string>(`logos/${encodeURIComponent(fileName)}`, 'GET');
  }

  // Generic method to handle any SailPoint SDK API calls
  // This acts as a catch-all for any SailPoint API functions
  [key: string]: any;

  async callSdkMethod(methodName: string, ...args: any[]): Promise<any> {
    return this.apiCall(`sdk/${methodName}`, 'POST', { args });
  }
}
