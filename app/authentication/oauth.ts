import { dialog, shell } from "electron";
import { getTokenDetails, parseJwt } from "./auth";
import { getConfig, getSecureValue, setSecureValue } from "./config";
import { LambdaUUIDResponse, RefreshResponse, TokenResponse, TokenSet, EncryptedTokenData } from "./types";
import { generateKeyPair, decryptToken } from "./crypto";

const AuthLambdaBaseURL = 'https://nug87yusrg.execute-api.us-east-1.amazonaws.com/Prod/sailapps'
const authLambdaAuthURL = `${AuthLambdaBaseURL}/auth`
const authLambdaTokenURL = `${AuthLambdaBaseURL}/auth/token`
const authLambdaRefreshURL = `${AuthLambdaBaseURL}/auth/refresh`


/**
 * Retrieves and securely stores RSA key pair for OAuth authentication
 * @param environment - The environment name to store keys for
 * @returns Promise resolving to the public key in Base64 format
 */
async function getOrCreateKeyPair(environment: string): Promise<string> {
    try {
        // Try to retrieve existing keys
        const privateKey = getSecureValue('environments.oauth.privateKey', environment);
        const publicKey = getSecureValue('environments.oauth.publicKey', environment);
        
        // If we have both keys, return the public key
        if (privateKey && publicKey) {
            console.log('Using existing RSA keys for environment:', environment);
            return publicKey;
        }
        
        // Otherwise generate new keys
        console.log('Generating new RSA keys for environment:', environment);
        const keyPair = generateKeyPair(2048);
        
        // Store the keys securely
        setSecureValue('environments.oauth.privateKey', environment, keyPair.privateKey);
        setSecureValue('environments.oauth.publicKey', environment, keyPair.publicKeyBase64);
        
        return keyPair.publicKeyBase64;
    } catch (error) {
        console.error('Error getting or creating key pair:', error);
        throw error;
    }
}

/**
* Retrieves stored OAuth tokens for a given environment
* @param environment - The environment name to retrieve tokens for
* @returns Promise resolving to stored OAuth tokens or undefined if not found
*/
export function getStoredOAuthTokens(environment: string): TokenSet | undefined {
    try {
        const accessToken = getSecureValue('environments.oauth.accesstoken', environment);
        const accessExpiry = getSecureValue('environments.oauth.expiry', environment);
        const refreshToken = getSecureValue('environments.oauth.refreshtoken', environment);
        const refreshExpiry = getSecureValue('environments.oauth.refreshexpiry', environment);

        if (!accessToken || !accessExpiry || !refreshToken || !refreshExpiry) {
            return undefined;
        }

        return {
            accessToken,
            accessExpiry: new Date(accessExpiry),
            refreshToken,
            refreshExpiry: new Date(refreshExpiry),
        };
    } catch (error) {
        console.error('Error retrieving OAuth tokens:', error);
        throw error;
    }
}

/**
 * Stores OAuth tokens securely for a given environment
 * @param environment - The environment name to store tokens for
 * @param tokenSet - The token set to store
 */
export function storeOAuthTokens(environment: string, tokenSet: TokenSet): void {
    console.log('Storing OAuth tokens for environment:', environment);
    if (!tokenSet.refreshToken || !tokenSet.refreshExpiry) {
        throw new Error('Invalid token set, missing refresh token or expiry');
    }

    try {
        setSecureValue('environments.oauth.accesstoken', environment, tokenSet.accessToken);
        setSecureValue('environments.oauth.expiry', environment, tokenSet.accessExpiry.toISOString());
        setSecureValue('environments.oauth.refreshtoken', environment, tokenSet.refreshToken);
        setSecureValue('environments.oauth.refreshexpiry', environment, tokenSet.refreshExpiry.toISOString());

        console.log(`OAuth tokens stored for environment: ${environment}`);
    } catch (error) {
        console.error('Error storing OAuth tokens:', error);
        throw error;
    }
}

/**
* Validates OAuth tokens for a given environment
* @param environment - The environment name to validate OAuth tokens for
* @returns Promise resolving to token validation result
*/
export function validateOAuthTokens(environment: string) {
    try {
        const storedTokens = getStoredOAuthTokens(environment);
        if (!storedTokens) {
            return { isValid: false, needsRefresh: false };
        }

        if (!storedTokens.refreshToken || !storedTokens.refreshExpiry) {
            return { isValid: false, needsRefresh: false };
        }

        const now = new Date();

        // Check if refresh token is expired, the refresh token should always be the last thing to expire, so if its expired, we need a whole new OAuth session
        const refreshTokenDetails = getTokenDetails(storedTokens.refreshToken);
        if (refreshTokenDetails.expiry < now) {
            console.log('OAuth refresh token is expired');
            return { isValid: false, needsRefresh: false, tokenDetails: refreshTokenDetails };
        }

        // Check if access token is expired or will expire soon (within 5 minutes)
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
        const accessTokenDetails = getTokenDetails(storedTokens.accessToken);
        if (accessTokenDetails.expiry <= fiveMinutesFromNow) {
            console.log('OAuth access token is expired or expiring soon, needs refresh');
            return {
                isValid: false,
                needsRefresh: true,
                tokenDetails: accessTokenDetails
            };
        }

        return { isValid: true, needsRefresh: false, tokenDetails: accessTokenDetails };
    } catch (error) {
        console.error('Error validating OAuth tokens:', error);
        return { isValid: false, needsRefresh: false };
    }
}


/**
 * Performs OAuth login for a given environment
 * @param tenant - The tenant name
 * @param baseAPIUrl - The base API URL
 * @param environment - The environment name
 * @returns Promise resolving to the token set
 */
export const OAuthLogin = async ({ tenant, baseAPIUrl, environment }: { tenant: string, baseAPIUrl: string, environment: string }): Promise<{ success: boolean, error: string }> => {
    try {
        // Step 1: Get or create RSA key pair and get public key
        const publicKeyBase64 = await getOrCreateKeyPair(environment);
        
        // Step 2: Initiate authentication flow with the public key
        const authResponse = await fetch(authLambdaAuthURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tenant,
                apiBaseURL: baseAPIUrl,
                publicKey: publicKeyBase64
            }),
        });

        if (!authResponse.ok) {
            throw new Error(`Auth lambda returned non-200 status: ${authResponse.status}`);
        }

        const authData: LambdaUUIDResponse = await authResponse.json();
        console.log('Auth Response:', authData);

        // Step 3: Present Auth URL to user
        console.log('Attempting to open browser for authentication');
        try {
            // Using Electron's shell.openExternal to open the browser
            await shell.openExternal(authData.authURL);
            console.log('Successfully opened OAuth URL in default browser');

        } catch (err) {
            dialog.showMessageBox({
                title: 'OAuth Login',
                message: 'Please manually open the OAuth login page below',
                detail: authData.authURL,
                buttons: ['OK']
            });
            console.warn('Cannot open browser automatically. Please manually open OAuth login page below');
            console.log('OAuth URL:', authData.authURL);
            // Continue with the flow even if browser opening fails
        }

        // Step 4: Poll Auth-Lambda for token using UUID
        const pollInterval = 2000; // 2 seconds
        const timeout = 5 * 60 * 1000; // 5 minutes
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            try {
                const tokenResponse = await fetch(`${authLambdaTokenURL}/${authData.id}`);

                if (tokenResponse.ok) {
                    const tokenData: TokenResponse = await tokenResponse.json();

                    // Step 5: Get the private key for decryption
                    const privateKey = getSecureValue('environments.oauth.privateKey', environment);
                    if (!privateKey) {
                        throw new Error('Private key not found for environment');
                    }

                    // Step 6: Decrypt the token info using the private key
                    const decryptedToken = decryptToken(tokenData.tokenInfo, privateKey);
                    console.log('Decrypted token info');

                    // Validate that we have the required tokens
                    if (!decryptedToken.access_token) {
                        console.error('Missing accessToken in response');
                        return { success: false, error: 'OAuth response missing access token' };
                    }

                    if (!decryptedToken.refresh_token) {
                        console.error('Missing refreshToken in response');
                        return { success: false, error: 'OAuth response missing refresh token' };
                    }

                    // Step 7: Parse and store the tokens
                    const accessTokenClaims = parseJwt(decryptedToken.access_token);
                    const refreshTokenClaims = parseJwt(decryptedToken.refresh_token);

                    const tokenSet = {
                        accessToken: decryptedToken.access_token,
                        accessExpiry: new Date(accessTokenClaims.exp * 1000),
                        refreshToken: decryptedToken.refresh_token,
                        refreshExpiry: new Date(refreshTokenClaims.exp * 1000),
                    };

                    storeOAuthTokens(environment, tokenSet);
                    return { success: true, error: '' };
                }
            } catch (err) {
                console.error('Error polling for token:', err);
            }

            // We are polling the API every 2 seconds, to continue the exchange after the user has logged in
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        return { success: false, error: 'Authentication timed out after 5 minutes' };
    } catch (error) {
        console.error('OAuth login error:', error);
        return { success: false, error: 'OAuth login failed: ' + error };
    }
};

/**
 * Refreshes OAuth tokens for a given environment using the provided refresh token
 * @param environment - The environment name to refresh tokens for
 * @returns Promise resolving to the new token set
 */
export const refreshOAuthToken = async (environment: string): Promise<void> => {
    try {
        console.log(`Refreshing OAuth token for environment: ${environment}`);

        // Get API URL from config
        const config = getConfig();
        const envConfig = config.environments[environment];
        if (!envConfig) {
            throw new Error('Environment configuration not found');
        }

        const storedTokens = getStoredOAuthTokens(environment);
        if (!storedTokens) {
            throw new Error('No stored OAuth tokens found for environment');
        }

        const apiUrl = envConfig.baseurl;
        const tenant = envConfig.tenanturl;

        // Prepare the refresh request body
        const refreshRequestBody = {
            refreshToken: storedTokens.refreshToken,
            apiBaseURL: apiUrl,
            tenant: tenant || environment
        };

        const response = await fetch(authLambdaRefreshURL, {
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
        storeOAuthTokens(environment, tokenSet);

        console.log('OAuth token refresh successful');
    } catch (error) {
        console.error('Error refreshing OAuth token:', error);
        throw error;
    }
};