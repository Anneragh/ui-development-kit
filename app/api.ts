import {
  Configuration,
  TenantV2024Api,
  ConfigurationParameters,
} from 'sailpoint-api-client';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as keytar from 'keytar';
import * as os from 'os';
import { shell } from 'electron';
import axios, { AxiosResponse } from 'axios';

export let apiConfig: Configuration;
let testMode = false;
let aitestMode = true;

interface CLIConfig {
  authtype: string;
  activeenvironment: string;
  environments: {
    [key: string]: {
      tenanturl: string;
      baseurl: string;
      pat: {
        accessToken: string;
      };
    };
  };
}

interface Tenant {
  active: boolean;
  apiUrl: string;
  tenantUrl: string;
  clientId: string | null;
  clientSecret: string | null;
  name: string;
  authType: string; // Global authentication type
  tenantName: string;
}

async function getConfig(): Promise<CLIConfig> {
  const homedir = os.homedir();
  const configPath = path.join(homedir, '.sailpoint', 'config.yaml');

  try {
    const configFile = fs.readFileSync(configPath, 'utf8');
    return yaml.load(configFile) as CLIConfig;
  } catch (error) {
    console.error('Error reading config file:', error);
    throw error;
  }
}

export const disconnectFromISC = async () => {
  try {
    // Simply clear the API configuration
    apiConfig = undefined as any;
    
    console.log('Successfully disconnected from ISC');
  } catch (error) {
    console.error('Error during disconnect:', error);
    // Ensure apiConfig is cleared even if there's an error
    apiConfig = undefined as any;
  }
};

interface TokenSet {
  accessToken: string;
  accessExpiry: Date;
  refreshToken: string;
  refreshExpiry: Date;
}

// New interfaces for token management
interface StoredOAuthTokens {
  accessToken: string;
  accessExpiry: string; // ISO string for serialization
  refreshToken: string;
  refreshExpiry: string; // ISO string for serialization
  environment: string;
}

interface TokenValidationResult {
  isValid: boolean;
  needsRefresh: boolean;
  token?: string;
  expiry?: Date;
}

interface AuthResponse {
  id: string;
  encryptionKey: string;
  authURL: string;
  baseURL: string;
}

interface TokenResponse {
  baseURL: string;
  id: string;
  tokenInfo: string;
}

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

// New interface for unified login
interface UnifiedLoginRequest {
  environment: string;
  apiUrl: string;
  baseUrl: string;
  authType: 'oauth' | 'pat';
  clientId?: string;
  clientSecret?: string;
  tenant?: string; // Only needed for OAuth
}

interface UnifiedLoginResult {
  success: boolean;
  connected: boolean;
  name?: string;
  error?: string;
  tokens?: TokenSet; // For OAuth flow
}

// Unified login function that handles both PAT and OAuth flows
export const unifiedLogin = async (request: UnifiedLoginRequest): Promise<UnifiedLoginResult> => {
  console.log(`Starting ${request.authType} login for environment: ${request.environment}`);
  
  try {
    // First, ensure the environment exists in config
    const config = await getConfig();
    if (!config.environments[request.environment]) {
      return {
        success: false,
        connected: false,
        error: `Environment '${request.environment}' not found in configuration`
      };
    }

    // Check for existing valid tokens before proceeding
    const tokenStatus = await checkEnvironmentTokenStatus(request.environment);
    if (tokenStatus.hasValidTokens && tokenStatus.authType === request.authType) {
      console.log(`Using existing valid ${tokenStatus.authType} tokens for environment: ${request.environment}`);
      
      // Test the connection with existing tokens
      let connectionResult;
      if (tokenStatus.authType === 'oauth') {
        // For OAuth, we need to get the stored access token
        const storedTokens = await getStoredOAuthTokens(request.environment);
        if (storedTokens) {
          connectionResult = await connectToISCWithOAuth(
            request.apiUrl,
            request.baseUrl,
            storedTokens.accessToken,
            request.environment
          );
        }
      } else {
        // For PAT, we need to get the stored access token
        const accessToken = await getAccessToken(request.environment);
        if (accessToken) {
          connectionResult = await connectToISCWithOAuth(
            request.apiUrl,
            request.baseUrl,
            accessToken,
            request.environment
          );
        }
      }

      if (connectionResult && connectionResult.connected) {
        return {
          success: true,
          connected: true,
          name: connectionResult.name
        };
      }
    } else if (tokenStatus.hasValidTokens && tokenStatus.authType !== request.authType) {
      console.log(`Found valid ${tokenStatus.authType} tokens but user requested ${request.authType} authentication. Proceeding with new ${request.authType} authentication.`);
    }

    // Update global auth type to match the requested flow
    config.authtype = request.authType;
    config.activeenvironment = request.environment;
    
    // Save the updated config
    const homedir = os.homedir();
    const configPath = path.join(homedir, '.sailpoint', 'config.yaml');
    const yamlStr = yaml.dump(config);
    fs.writeFileSync(configPath, yamlStr, 'utf8');

    if (request.authType === 'oauth') {
      // OAuth flow
      if (!request.tenant) {
        return {
          success: false,
          connected: false,
          error: 'Tenant is required for OAuth login'
        };
      }

      try {
        // Perform OAuth login
        const tokenSet = await OAuthLogin({
          tenant: request.tenant,
          baseAPIUrl: request.apiUrl,
          environment: request.environment
        });

        // Test the connection with the new tokens
        const connectionResult = await connectToISCWithOAuth(
          request.apiUrl,
          request.baseUrl,
          tokenSet.accessToken,
          request.environment
        );

        return {
          success: true,
          connected: connectionResult.connected,
          name: connectionResult.name,
          tokens: tokenSet
        };
      } catch (oauthError) {
        console.error('OAuth login failed:', oauthError);
        return {
          success: false,
          connected: false,
          error: oauthError instanceof Error ? oauthError.message : 'OAuth login failed'
        };
      }
    } else {
      // PAT flow
      if (!request.clientId || !request.clientSecret) {
        return {
          success: false,
          connected: false,
          error: 'Client ID and Client Secret are required for PAT login'
        };
      }

      try {
        // Store client credentials securely
        await setSecureValue('environments.pat.clientid', request.environment, request.clientId);
        await setSecureValue('environments.pat.clientsecret', request.environment, request.clientSecret);

        // Perform PAT login
        const connectionResult = await connectToISC(
          request.apiUrl,
          request.baseUrl,
          request.clientId,
          request.clientSecret,
          request.environment
        );

        return {
          success: true,
          connected: connectionResult.connected,
          name: connectionResult.name
        };
      } catch (patError) {
        console.error('PAT login failed:', patError);
        return {
          success: false,
          connected: false,
          error: patError instanceof Error ? patError.message : 'PAT login failed'
        };
      }
    }
  } catch (error) {
    console.error('Unified login error:', error);
    return {
      success: false,
      connected: false,
      error: error instanceof Error ? error.message : 'Login failed'
    };
  }
};

export const OAuthLogin = async ({ tenant, baseAPIUrl, environment }: { tenant: string, baseAPIUrl: string, environment: string }): Promise<TokenSet> => {
  // Step 1: Request UUID, encryption key, and Auth URL from Auth-Lambda
  const authLambdaURL = 'https://nug87yusrg.execute-api.us-east-1.amazonaws.com/Prod/sailapps/uuid';

  try {
    const response = await fetch(authLambdaURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenant, baseAPIUrl }),
    });

    if (!response.ok) {
      throw new Error(`Auth lambda returned non-200 status: ${response.status}`);
    }

    const authResponse: AuthResponse = await response.json();
    console.log('Auth Response:', authResponse);

    // Step 2: Present Auth URL to user
    console.log('Attempting to open browser for authentication');
    try {
      // Using Electron's shell.openExternal to open the browser
      await shell.openExternal(authResponse.authURL);
      console.log('Successfully opened OAuth URL in default browser');

    } catch (err) {
      console.warn('Cannot open browser automatically. Please manually open OAuth login page below');
      console.log('OAuth URL:', authResponse.authURL);
      // Continue with the flow even if browser opening fails
    }

    // Step 3: Poll Auth-Lambda for token using UUID
    const pollInterval = 2000; // 2 seconds
    const timeout = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const tokenResponse = await fetch(`${authLambdaURL}/${authResponse.id}`);

        if (tokenResponse.ok) {
          const tokenData: TokenResponse = await tokenResponse.json();

          // Decrypt the token info using the encryption key
          const decryptedTokenInfo = await decryptTokenInfo(tokenData.tokenInfo, authResponse.encryptionKey);
          console.log('Decrypted token info:', decryptedTokenInfo);
          
          const response: RefreshResponse = JSON.parse(decryptedTokenInfo);
          console.log('Parsed response:', response);

          // Validate that we have the required tokens
          if (!response.access_token) {
            console.error('Missing accessToken in response');
            throw new Error('OAuth response missing access token');
          }

          if (!response.refresh_token) {
            console.error('Missing refreshToken in response');
            throw new Error('OAuth response missing refresh token');
          }

          // Parse tokens to get expiry
          const accessTokenClaims = parseJwt(response.access_token);
          const refreshTokenClaims = parseJwt(response.refresh_token);

          const tokenSet = {
            accessToken: response.access_token,
            accessExpiry: new Date(accessTokenClaims.exp * 1000),
            refreshToken: response.refresh_token,
            refreshExpiry: new Date(refreshTokenClaims.exp * 1000),
          };

          // Store the tokens for future use
          await storeOAuthTokens(environment, tokenSet);

          return tokenSet;
        }
      } catch (err) {
        console.error('Error polling for token:', err);
      }

      // Wait for the next poll interval
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Authentication timed out after 5 minutes');
  } catch (error) {
    console.error('OAuth login error:', error);
    throw error;
  }
};

// Helper function to parse JWT without verification
function parseJwt(token: string): any {
  if (!token) {
    throw new Error('Token is undefined or empty');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format - token should have 3 parts');
  }

  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
}

// Helper function to decrypt token info
async function decryptTokenInfo(encryptedToken: string, encryptionKey: string): Promise<string> {
  try {
    // Split the IV and encrypted data
    const parts = encryptedToken.split(':');
    if (parts.length !== 2) {
      throw new Error('invalid encrypted token format');
    }

    // Convert hex-encoded IV and encrypted data to Buffer
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = Buffer.from(parts[1], 'hex');

    // Convert hex-encoded encryption key to Buffer
    const key = Buffer.from(encryptionKey, 'hex');

    // Create decipher
    const crypto = require('crypto');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    decipher.setAutoPadding(false); // We'll handle padding manually

    // Decrypt the data
    let decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);

    // Remove PKCS7 padding
    if (decrypted.length > 0) {
      const paddingLen = decrypted[decrypted.length - 1];
      // PKCS7 padding: padding length should be between 1 and block size (16 for AES)
      if (paddingLen > 0 && paddingLen <= 16 && paddingLen <= decrypted.length) {
        // Verify all padding bytes are the same
        let validPadding = true;
        for (let i = decrypted.length - paddingLen; i < decrypted.length; i++) {
          if (decrypted[i] !== paddingLen) {
            validPadding = false;
            break;
          }
        }
        
        if (validPadding) {
          decrypted = decrypted.subarray(0, decrypted.length - paddingLen);
        }
      }
    }

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
}

interface HarborPilotChatResponse {
  actions: HarborPilotAction[];
}
interface HarborPilotAction {
  data: any;
}

export const harborPilotTransformChat = async (
  chat: string,
): Promise<HarborPilotChatResponse> => {
  if (aitestMode) {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
    return {
      actions: [
        {
          data: {
            id: '1e65870d-70d0-4b03-adbf-5e2e3196560e',
            name: 'Uppercase First 3 Characters',
            type: 'concat',
            attributes: {
              values: [
                {
                  type: 'upper',
                  attributes: {
                    input: {
                      type: 'substring',
                      attributes: {
                        input: {
                          type: 'tester',
                        },
                        begin: 0,
                        end: 3,
                      },
                    },
                  },
                },
                {
                  type: 'substring',
                  attributes: {
                    input: {
                      type: 'tester',
                    },
                    begin: 3,
                  },
                },
              ],
            },
            internal: false,
          },
        },
      ],
    };
  }

  // Check if apiConfig is available
  if (!apiConfig) {
    throw new Error('Not connected to ISC. Please connect first.');
  }

  let data = JSON.stringify({
    userMsg: chat,
    sessionId: '8f7e6186-72bd-4719-8c6e-95180a770e72',
    context: {
      tools: ['transform-builder'],
    },
  });

  let config = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'bearer ' + (await apiConfig.accessToken),
    },
    maxBodyLength: Infinity,
  };

  try {
    const response: AxiosResponse<HarborPilotChatResponse> = await axios.post(
      'http://localhost:7100/beta/harbor-pilot/chat',
      data,
      config,
    );
    return response.data;
  } catch (error) {
    console.error('Error in harbor pilot chat:', error);
    throw error;
  }
};

// Unified connection function that handles token validation and connection
async function connectWithTokenValidation(
  environment: string,
  apiUrl: string,
  baseUrl: string,
  clientId?: string,
  clientSecret?: string,
): Promise<{ connected: boolean; name: string | undefined }> {
  if (testMode) {
    return { connected: true, name: 'DevDays 2025' };
  }

  try {
    console.log(`Validating tokens for environment: ${environment}`);
    const validation = await validateTokens(environment);
    let accessToken: string | undefined;

    if (validation.isValid && validation.token) {
      console.log(`Using existing valid ${validation.authType} token for environment: ${environment}`);
      accessToken = validation.token;
    } else if (validation.needsRefresh && validation.token) {
      console.log(`${validation.authType} token needs refresh for environment: ${environment}, attempting to refresh`);
      try {
        if (validation.authType === 'oauth') {
          const newTokenSet = await refreshOAuthToken(environment, validation.token);
          accessToken = newTokenSet.accessToken;
        } else {
          accessToken = await refreshPATToken(environment);
        }
        console.log(`${validation.authType} token refreshed successfully for environment: ${environment}`);
      } catch (refreshError) {
        console.error(`${validation.authType} token refresh failed for environment: ${environment}:`, refreshError);
        throw new Error(`${validation.authType} token refresh failed. Please re-authenticate.`);
      }
    } else {
      console.log(`No valid ${validation.authType} tokens found for environment: ${environment} - this is expected for new connections`);
      // Return a special result to indicate no tokens found, so the caller can proceed with authentication
      return { connected: false, name: undefined };
    }

    // Connect using the validated token
    console.log(`Connecting with validated ${validation.authType} token for environment: ${environment}`);
    return await connectToISCWithOAuth(apiUrl, baseUrl, accessToken, environment);
  } catch (error) {
    console.error(`Error in token validation and connection for environment: ${environment}:`, error);
    return { connected: false, name: undefined };
  }
}

// Function to validate tokens immediately after a connection is established
export const validateConnectionTokens = async (environment: string): Promise<{
  isValid: boolean;
  authType: string;
  error?: string;
}> => {
  try {
    console.log(`Validating connection tokens for environment: ${environment}`);
    const validation = await validateTokens(environment);
    
    if (validation.isValid) {
      console.log(`Connection tokens validated successfully for environment: ${environment} (${validation.authType})`);
      return {
        isValid: true,
        authType: validation.authType
      };
    } else {
      console.log(`Connection tokens validation failed for environment: ${environment} (${validation.authType})`);
      return {
        isValid: false,
        authType: validation.authType,
        error: validation.needsRefresh ? 'Tokens need refresh' : 'No valid tokens found'
      };
    }
  } catch (error) {
    console.error(`Error validating connection tokens for environment: ${environment}:`, error);
    return {
      isValid: false,
      authType: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Function to store PAT token after successful authentication
async function storePATToken(environment: string, accessToken: string): Promise<void> {
  try {
    await setSecureValue('environments.pat.accesstoken', environment, accessToken);
    console.log(`PAT token stored for environment: ${environment}`);
  } catch (error) {
    console.error('Error storing PAT token:', error);
    throw error;
  }
}

export const connectToISC = async (
  apiUrl: string,
  baseUrl: string,
  clientId: string,
  clientSecret: string,
  environment?: string,
) => {
  console.log('Connecting to ISC:');
  
  // If environment is provided, try to use existing valid tokens first
  if (environment) {
    try {
      const tokenResult = await connectWithTokenValidation(environment, apiUrl, baseUrl, clientId, clientSecret);
      if (tokenResult.connected) {
        return tokenResult;
      }
      console.log('No valid tokens found, proceeding with new authentication');
    } catch (error) {
      console.log('Token-based connection failed, proceeding with new authentication');
    }
  }

  // Proceed with original authentication flow
  let config: ConfigurationParameters = {
    clientId: clientId,
    clientSecret: clientSecret,
    tokenUrl: apiUrl + `/oauth/token`,
    baseurl: apiUrl,
  };
  
  try {
    apiConfig = new Configuration(config);
    apiConfig.experimental = true;
    let tenantApi = new TenantV2024Api(apiConfig);
    let response = await tenantApi.getTenant();
    
    // Store the new PAT token if environment is provided
    if (environment) {
      // For PAT authentication, we need to get the actual token from the configuration
      // The token is obtained during the OAuth client credentials flow
      try {
        // Make a token request to get the actual access token
        const tokenUrl = `${apiUrl}/oauth/token`;
        const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        
        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${authHeader}`
          },
          body: 'grant_type=client_credentials'
        });
        
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          if (tokenData.access_token) {
            await storePATToken(environment, tokenData.access_token);
          }
        }
      } catch (tokenError) {
        console.log('Could not store PAT token:', tokenError);
      }
    }
    
    return { connected: true, name: response.data.fullName };
  } catch (error) {
    console.error('Error connecting to ISC:', error);
    return { connected: false, name: undefined };
  }
};

export const connectToISCWithOAuth = async (
  apiUrl: string,
  baseUrl: string,
  accessToken: string,
  environment?: string,
): Promise<{ connected: boolean; name: string | undefined }> => {
  console.log('Connecting to ISC with OAuth:');
  if (testMode) {
    return { connected: true, name: 'DevDays 2025' };
  }
  
  let config: ConfigurationParameters = {
    accessToken: accessToken,
    baseurl: apiUrl,
  };
  
  try {
    apiConfig = new Configuration(config);
    apiConfig.experimental = true;
    let tenantApi = new TenantV2024Api(apiConfig);
    let response = await tenantApi.getTenant();
    return { connected: true, name: response.data.fullName };
  } catch (error) {
    console.error('Error connecting to ISC with OAuth:', error);
    return { connected: false, name: undefined };
  }
};

// Unified token validation function
async function validateTokens(environment: string): Promise<{
  isValid: boolean;
  needsRefresh: boolean;
  token?: string;
  expiry?: Date;
  authType: string;
}> {
  try {
    const authType = await getGlobalAuthType();
    
    if (authType === 'oauth') {
      const oauthValidation = await validateOAuthTokens(environment);
      return {
        ...oauthValidation,
        authType: 'oauth'
      };
    } else {
      const patValidation = await validatePATToken(environment);
      return {
        ...patValidation,
        authType: 'pat'
      };
    }
  } catch (error) {
    console.error('Error validating tokens:', error);
    return {
      isValid: false,
      needsRefresh: false,
      authType: 'unknown'
    };
  }
}

// Simplified environment-based connection function
export const connectToISCWithEnvironment = async (
  environment: string,
  apiUrl: string,
  baseUrl: string,
  clientId?: string,
  clientSecret?: string,
): Promise<{ connected: boolean; name: string | undefined }> => {
  console.log(`Connecting to ISC using environment: ${environment}`);
  return await connectWithTokenValidation(environment, apiUrl, baseUrl, clientId, clientSecret);
};

async function getSecureValue(
  key: string,
  environment: string,
): Promise<string> {
  try {
    const allCreds = await keytar.findCredentials(key);
    const cred = getCredential(allCreds, environment);
    return cred?.password || '';
  } catch (error) {
    console.error(`Error getting secure value for ${key}:`, error);
    return '';
  }
}

function getCredential(
  allCreds: Array<{ account: string; password: string }>,
  environment: string,
): { account: string; password: string } | undefined {
  return allCreds.find((cred) => cred.account === environment);
}

async function getClientId(env: string): Promise<string | null> {
  return getSecureValue('environments.pat.clientid', env);
}

async function getClientSecret(env: string): Promise<string | null> {
  return getSecureValue('environments.pat.clientsecret', env);
}

async function getAccessToken(env: string): Promise<string | null> {
  return getSecureValue('environments.pat.accesstoken', env);
}

export const getTenants = async () => {
  try {
    const config = await getConfig();

    const activeEnv = config.activeenvironment;

    const tenants: Tenant[] = [];
    for (let environment of Object.keys(config.environments)) {
      const envConfig = config.environments[environment];
      tenants.push({
        active: environment === activeEnv,
        name: environment,
        apiUrl: envConfig.baseurl,
        tenantUrl: envConfig.tenanturl,
        clientId: await getClientId(environment),
        clientSecret: await getClientSecret(environment),
        authType: config.authtype,
        tenantName: environment,
      });
    }
    return tenants;
  } catch (error) {
    console.error('Error getting tenants:', error);
    return [];
  }
};

interface EnvironmentConfigRequest {
  environmentName: string;
  tenantUrl: string;
  baseUrl: string;
  authType: 'oauth' | 'pat';
  clientId?: string;
  clientSecret?: string;
  update: boolean;
}

interface ConfigUpdateResult {
  success: boolean;
  error?: string;
}

async function setSecureValue(
  key: string,
  environment: string,
  value: string,
): Promise<void> {
  try {
    await keytar.setPassword(key, environment, value);
  } catch (error) {
    console.error(`Error setting secure value for ${key}:`, error);
    throw error;
  }
}

async function deleteSecureValue(
  key: string,
  environment: string,
): Promise<void> {
  try {
    await keytar.deletePassword(key, environment);
  } catch (error) {
    console.error(`Error deleting secure value for ${key}:`, error);
    // Don't throw error for delete operations as the key might not exist
  }
}

export const createOrUpdateEnvironment = async (
  config: EnvironmentConfigRequest,
): Promise<ConfigUpdateResult> => {
  try {
    const homedir = os.homedir();
    const configPath = path.join(homedir, '.sailpoint', 'config.yaml');
    const configDir = path.dirname(configPath);

    // Ensure the .sailpoint directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    let existingConfig: CLIConfig;

    // Read existing config or create new one
    try {
      const configFile = fs.readFileSync(configPath, 'utf8');
      existingConfig = yaml.load(configFile) as CLIConfig;
    } catch (error) {
      // Create new config if file doesn't exist
      existingConfig = {
        authtype: 'pat',
        activeenvironment: '',
        environments: {}
      };
    }

    // Check if environment already exists and update flag is not set
    if (existingConfig.environments[config.environmentName] && !config.update) {
      return {
        success: false,
        error: `Environment '${config.environmentName}' already exists. Use update mode to modify it.`
      };
    }

    // Create or update environment configuration
    existingConfig.environments[config.environmentName] = {
      tenanturl: config.tenantUrl,
      baseurl: config.baseUrl,
      pat: {
        accessToken: '' // This will be populated during authentication
      }
    };

    // Set auth type
    existingConfig.authtype = config.authType;

    // Set as active environment
    existingConfig.activeenvironment = config.environmentName;

    // Save credentials securely if provided
    if (config.authType === 'pat' && config.clientId && config.clientSecret) {
      await setSecureValue('environments.pat.clientid', config.environmentName, config.clientId);
      await setSecureValue('environments.pat.clientsecret', config.environmentName, config.clientSecret);
    }

    // Write config file
    const yamlStr = yaml.dump(existingConfig);
    fs.writeFileSync(configPath, yamlStr, 'utf8');

    return { success: true };
  } catch (error) {
    console.error('Error creating/updating environment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const deleteEnvironment = async (
  environmentName: string,
): Promise<ConfigUpdateResult> => {
  try {
    const homedir = os.homedir();
    const configPath = path.join(homedir, '.sailpoint', 'config.yaml');

    if (!fs.existsSync(configPath)) {
      return {
        success: false,
        error: 'Configuration file not found'
      };
    }

    const configFile = fs.readFileSync(configPath, 'utf8');
    const existingConfig = yaml.load(configFile) as CLIConfig;

    // Check if environment exists
    if (!existingConfig.environments[environmentName]) {
      return {
        success: false,
        error: `Environment '${environmentName}' does not exist`
      };
    }

    // Remove environment from config
    delete existingConfig.environments[environmentName];

    // If this was the active environment, clear it or set to another one
    if (existingConfig.activeenvironment === environmentName) {
      const remainingEnvs = Object.keys(existingConfig.environments);
      existingConfig.activeenvironment = remainingEnvs.length > 0 ? remainingEnvs[0] : '';
    }

    // Delete stored credentials
    await deleteSecureValue('environments.pat.clientid', environmentName);
    await deleteSecureValue('environments.pat.clientsecret', environmentName);
    await deleteSecureValue('environments.pat.accesstoken', environmentName);
    
    // Delete OAuth tokens
    await deleteSecureValue('environments.oauth.tokens', environmentName);

    // Write updated config file
    const yamlStr = yaml.dump(existingConfig);
    fs.writeFileSync(configPath, yamlStr, 'utf8');

    return { success: true };
  } catch (error) {
    console.error('Error deleting environment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const setActiveEnvironment = async (
  environmentName: string,
): Promise<ConfigUpdateResult> => {
  try {
    const homedir = os.homedir();
    const configPath = path.join(homedir, '.sailpoint', 'config.yaml');

    if (!fs.existsSync(configPath)) {
      return {
        success: false,
        error: 'Configuration file not found'
      };
    }

    const configFile = fs.readFileSync(configPath, 'utf8');
    const existingConfig = yaml.load(configFile) as CLIConfig;

    // Check if environment exists
    if (!existingConfig.environments[environmentName]) {
      return {
        success: false,
        error: `Environment '${environmentName}' does not exist`
      };
    }

    // Set as active environment
    existingConfig.activeenvironment = environmentName;

    // Write updated config file
    const yamlStr = yaml.dump(existingConfig);
    fs.writeFileSync(configPath, yamlStr, 'utf8');

    return { success: true };
  } catch (error) {
    console.error('Error setting active environment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const getGlobalAuthType = async (): Promise<string> => {
  try {
    const config = await getConfig();
    return config.authtype || 'pat';
  } catch (error) {
    console.error('Error getting global auth type:', error);
    return 'pat'; // Default to PAT if error
  }
};

export const setGlobalAuthType = async (authType: string): Promise<ConfigUpdateResult> => {
  try {
    const homedir = os.homedir();
    const configPath = path.join(homedir, '.sailpoint', 'config.yaml');

    if (!fs.existsSync(configPath)) {
      return {
        success: false,
        error: 'Configuration file not found'
      };
    }

    const configFile = fs.readFileSync(configPath, 'utf8');
    const existingConfig = yaml.load(configFile) as CLIConfig;

    // Update the global auth type
    existingConfig.authtype = authType;

    // Write updated config file
    const yamlStr = yaml.dump(existingConfig);
    fs.writeFileSync(configPath, yamlStr, 'utf8');

    return { success: true };
  } catch (error) {
    console.error('Error setting global auth type:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// New function to check token status for an environment
export const checkEnvironmentTokenStatus = async (environment: string): Promise<{
  hasValidTokens: boolean;
  authType: string;
  needsRefresh: boolean;
  expiry?: Date;
}> => {
  try {
    const validation = await validateTokens(environment);
    return {
      hasValidTokens: validation.isValid,
      authType: validation.authType,
      needsRefresh: validation.needsRefresh,
      expiry: validation.expiry
    };
  } catch (error) {
    console.error('Error checking token status:', error);
    return {
      hasValidTokens: false,
      authType: 'unknown',
      needsRefresh: false
    };
  }
};

// New functions for OAuth token management
async function storeOAuthTokens(environment: string, tokenSet: TokenSet): Promise<void> {
  try {
    const storedTokens: StoredOAuthTokens = {
      accessToken: tokenSet.accessToken,
      accessExpiry: tokenSet.accessExpiry.toISOString(),
      refreshToken: tokenSet.refreshToken,
      refreshExpiry: tokenSet.refreshExpiry.toISOString(),
      environment: environment
    };
    
    await setSecureValue('environments.oauth.tokens', environment, JSON.stringify(storedTokens));
    console.log(`OAuth tokens stored for environment: ${environment}`);
  } catch (error) {
    console.error('Error storing OAuth tokens:', error);
    throw error;
  }
}

async function getStoredOAuthTokens(environment: string): Promise<StoredOAuthTokens | null> {
  try {
    const tokenData = await getSecureValue('environments.oauth.tokens', environment);
    if (!tokenData) {
      return null;
    }
    
    return JSON.parse(tokenData) as StoredOAuthTokens;
  } catch (error) {
    console.error('Error retrieving OAuth tokens:', error);
    return null;
  }
}

async function validateOAuthTokens(environment: string): Promise<TokenValidationResult> {
  try {
    const storedTokens = await getStoredOAuthTokens(environment);
    if (!storedTokens) {
      return { isValid: false, needsRefresh: false };
    }

    const now = new Date();
    const accessExpiry = new Date(storedTokens.accessExpiry);
    const refreshExpiry = new Date(storedTokens.refreshExpiry);

    // Check if refresh token is expired
    if (refreshExpiry <= now) {
      console.log('OAuth refresh token is expired');
      return { isValid: false, needsRefresh: false };
    }

    // Check if access token is expired or will expire soon (within 5 minutes)
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    if (accessExpiry <= fiveMinutesFromNow) {
      console.log('OAuth access token is expired or expiring soon, needs refresh');
      return { 
        isValid: false, 
        needsRefresh: true, 
        token: storedTokens.refreshToken,
        expiry: refreshExpiry
      };
    }

    // Test the token against the API to see if it's still valid
    try {
      const config = await getConfig();
      const envConfig = config.environments[environment];
      if (!envConfig) {
        console.log('Environment configuration not found for OAuth token validation');
        return { isValid: false, needsRefresh: false };
      }

      const apiUrl = envConfig.baseurl;
      const testConfig: ConfigurationParameters = {
        accessToken: storedTokens.accessToken,
        baseurl: apiUrl,
      };

      const testApiConfig = new Configuration(testConfig);
      testApiConfig.experimental = true;
      const tenantApi = new TenantV2024Api(testApiConfig);
      
      // Try to get tenant info to validate the token
      await tenantApi.getTenant();
      
      // If we get here, the token is valid
      console.log('OAuth token validation successful against API');
      return { 
        isValid: true, 
        needsRefresh: false, 
        token: storedTokens.accessToken,
        expiry: accessExpiry
      };
    } catch (apiError) {
      // Token is invalid or expired, even though local expiry check passed
      console.log('OAuth token validation failed against API:', apiError);
      return { 
        isValid: false, 
        needsRefresh: true, 
        token: storedTokens.refreshToken,
        expiry: refreshExpiry
      };
    }
  } catch (error) {
    console.error('Error validating OAuth tokens:', error);
    return { isValid: false, needsRefresh: false };
  }
}

async function validatePATToken(environment: string): Promise<TokenValidationResult> {
  try {
    const accessToken = await getAccessToken(environment);
    if (!accessToken) {
      console.log('No PAT token found for environment');
      return { isValid: false, needsRefresh: false };
    }

    // Test the token against the API to see if it's still valid
    try {
      const config = await getConfig();
      const envConfig = config.environments[environment];
      if (!envConfig) {
        console.log('Environment configuration not found for PAT token validation');
        return { isValid: false, needsRefresh: false };
      }

      const apiUrl = envConfig.baseurl;
      const testConfig: ConfigurationParameters = {
        accessToken: accessToken,
        baseurl: apiUrl,
      };

      const testApiConfig = new Configuration(testConfig);
      testApiConfig.experimental = true;
      const tenantApi = new TenantV2024Api(testApiConfig);
      
      // Try to get tenant info to validate the token
      await tenantApi.getTenant();
      
      // If we get here, the token is valid
      console.log('PAT token validation successful against API');
      return { 
        isValid: true, 
        needsRefresh: false, 
        token: accessToken
      };
    } catch (apiError) {
      // Token is invalid or expired
      console.log('PAT token validation failed against API:', apiError);
      
      // Check if it's a 401/403 error which indicates token is invalid
      if (apiError && typeof apiError === 'object' && 'status' in apiError) {
        const status = (apiError as any).status;
        if (status === 401 || status === 403) {
          console.log('PAT token is invalid (401/403 error), needs refresh');
          return { 
            isValid: false, 
            needsRefresh: true, 
            token: accessToken
          };
        }
      }
      
      // For other errors, we'll assume the token might still be valid
      // but there's a network or API issue
      console.log('PAT token validation failed due to API error, assuming token might still be valid');
      return { 
        isValid: true, 
        needsRefresh: false, 
        token: accessToken
      };
    }
  } catch (error) {
    console.error('Error validating PAT token:', error);
    return { isValid: false, needsRefresh: false };
  }
}

// OAuth token refresh implementation
export const refreshOAuthToken = async (environment: string, refreshToken: string): Promise<TokenSet> => {
  try {
    console.log(`Refreshing OAuth token for environment: ${environment}`);
    
    // Get API URL from config
    const config = await getConfig();
    const envConfig = config.environments[environment];
    if (!envConfig) {
      throw new Error('Environment configuration not found');
    }
    
    const apiUrl = envConfig.baseurl;
    
    // Use the Lambda refresh endpoint
    const authLambdaURL = 'https://nug87yusrg.execute-api.us-east-1.amazonaws.com/Prod/sailapps/refresh';
    
    // Prepare the refresh request body
    const refreshRequestBody = {
      refreshToken: refreshToken,
      apiBaseURL: apiUrl,
      tenant: environment
    };
    
    console.log('Sending refresh request to Lambda:', refreshRequestBody);
    
    const response = await fetch(authLambdaURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(refreshRequestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lambda refresh failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const refreshData: RefreshResponse = await response.json();
    
    if (!refreshData.access_token) {
      throw new Error('No access token in refresh response');
    }

    if (!refreshData.refresh_token) {
      throw new Error('No refresh token in refresh response');
    }

    // Parse tokens to get expiry
    const accessTokenClaims = parseJwt(refreshData.access_token);
    const refreshTokenClaims = parseJwt(refreshData.refresh_token);

    const tokenSet = {
      accessToken: refreshData.access_token,
      accessExpiry: new Date(accessTokenClaims.exp * 1000),
      refreshToken: refreshData.refresh_token,
      refreshExpiry: new Date(refreshTokenClaims.exp * 1000),
    };

    // Store the new tokens for future use
    await storeOAuthTokens(environment, tokenSet);

    console.log('OAuth token refresh successful');
    return tokenSet;
    
  } catch (error) {
    console.error('Error refreshing OAuth token:', error);
    throw error;
  }
};

// Placeholder function for PAT token refresh
export const refreshPATToken = async (environment: string): Promise<string> => {
  try {
    console.log(`Refreshing PAT token for environment: ${environment}`);
    
    // Get stored client credentials
    const clientId = await getClientId(environment);
    const clientSecret = await getClientSecret(environment);
    
    if (!clientId || !clientSecret) {
      throw new Error('Client credentials not found for environment');
    }
    
    // Get API URL from config
    const config = await getConfig();
    const envConfig = config.environments[environment];
    if (!envConfig) {
      throw new Error('Environment configuration not found');
    }
    
    const apiUrl = envConfig.baseurl;
    
    // Make OAuth client credentials request
    const tokenUrl = `${apiUrl}/oauth/token`;
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }
    
    const tokenData = await response.json();
    
    if (!tokenData.access_token) {
      throw new Error('No access token in response');
    }
    
    // Store the new token
    await setSecureValue('environments.pat.accesstoken', environment, tokenData.access_token);
    
    // Update the global API configuration with the new access token
    if (apiConfig) {
      apiConfig.accessToken = tokenData.access_token;
    }
    
    console.log('PAT token refreshed successfully');
    return tokenData.access_token;
  } catch (error) {
    console.error('Error refreshing PAT token:', error);
    throw error;
  }
};

// Export the function for use in other modules
export { getStoredOAuthTokens };


