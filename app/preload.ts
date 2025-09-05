import { UpdateEnvironmentRequest } from './authentication/config';

const { contextBridge, ipcRenderer: ipcMain } = require('electron');
const sdkPreloader = require('./sailpoint-sdk/sdk-preload');

contextBridge.exposeInMainWorld('electronAPI', {
  // Unified authentication and connection
  unifiedLogin: (environment: string) =>
    ipcMain.invoke('unified-login', environment),
  disconnectFromISC: () => ipcMain.invoke('disconnect-from-isc'),
  checkAccessTokenStatus: (environment: string) =>
    ipcMain.invoke('check-access-token-status', environment),
  checkRefreshTokenStatus: (environment: string) =>
    ipcMain.invoke('check-refresh-token-status', environment),
  getCurrentTokenDetails: (environment: string) =>
    ipcMain.invoke('get-current-token-details', environment),

  // Token management
  refreshTokens: (environment: string) =>
    ipcMain.invoke('refresh-tokens', environment),
  getStoredOAuthTokens: (environment: string) =>
    ipcMain.invoke('get-stored-oauth-tokens', environment),
  getStoredPATTokens: (environment: string) =>
    ipcMain.invoke('get-stored-pat-tokens', environment),
  validateTokens: (environment: string) =>
    ipcMain.invoke('validate-tokens', environment),
  storeClientCredentials: (
    environment: string,
    clientId: string,
    clientSecret: string
  ) =>
    ipcMain.invoke(
      'store-client-credentials',
      environment,
      clientId,
      clientSecret
    ),

  // Environment management
  getTenants: () => ipcMain.invoke('get-tenants'),
  updateEnvironment: (config: UpdateEnvironmentRequest) =>
    ipcMain.invoke('update-environment', config),
  deleteEnvironment: (environment: string) =>
    ipcMain.invoke('delete-environment', environment),
  setActiveEnvironment: (environment: string) =>
    ipcMain.invoke('set-active-environment', environment),
  getGlobalAuthType: () => ipcMain.invoke('get-global-auth-type'),
  setGlobalAuthType: (authType: 'oauth' | 'pat') =>
    ipcMain.invoke('set-global-auth-type', authType),

  // config file management
  readConfig: () => ipcMain.invoke('read-config'),
  writeConfig: (config: any) => ipcMain.invoke('write-config', config),

  // Logo file management
  writeLogo: (buffer, fileName) =>
    ipcMain.invoke('write-logo', buffer, fileName),
  checkLogoExists: (fileName) => ipcMain.invoke('check-logo-exists', fileName),
  getUserDataPath: () => ipcMain.invoke('get-user-data-path'),
  getLogoDataUrl: (fileName) => ipcMain.invoke('get-logo-data-url', fileName),

  // SDK functions
  ...sdkPreloader,
});
