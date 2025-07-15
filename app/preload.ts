const { contextBridge, ipcRenderer: ipcMain } = require('electron');
const sdkPreloader = require('./sailpoint-sdk/sdk-preload');

contextBridge.exposeInMainWorld('electronAPI', {
  // Unified authentication and connection
  unifiedLogin: (request: any) => ipcMain.invoke('unified-login', request),
  disconnectFromISC: () => ipcMain.invoke('disconnect-from-isc'),
  
  // Token management
  refreshOAuthToken: (environment: any, refreshToken: any) => ipcMain.invoke('refresh-oauth-token', environment, refreshToken),
  refreshPATToken: (environment: any) => ipcMain.invoke('refresh-pat-token', environment),
  checkEnvironmentTokenStatus: (environment: any) => ipcMain.invoke('check-environment-token-status', environment),
  getStoredOAuthTokens: (environment: any) => ipcMain.invoke('get-stored-oauth-tokens', environment),
  
  // Environment management
  getTenants: () => ipcMain.invoke('get-tenants'),
  createOrUpdateEnvironment: (config: any) => ipcMain.invoke('create-or-update-environment', config),
  deleteEnvironment: (environmentName: any) => ipcMain.invoke('delete-environment', environmentName),
  setActiveEnvironment: (environmentName: any) => ipcMain.invoke('set-active-environment', environmentName),
  getGlobalAuthType: () => ipcMain.invoke('get-global-auth-type'),
  setGlobalAuthType: (authType: any) => ipcMain.invoke('set-global-auth-type', authType),
  
  // Harbor Pilot
  harborPilotTransformChat: (chat: any) => ipcMain.invoke('harbor-pilot-transform-chat', chat),
  
  // config file management
  readConfig: () => ipcMain.invoke('read-config'),
  writeConfig: (config: any) => ipcMain.invoke('write-config', config),

  // Logo file management
  writeLogo: (buffer, fileName) => ipcMain.invoke('write-logo', buffer, fileName),
  checkLogoExists: (fileName) => ipcMain.invoke('check-logo-exists', fileName),
  getUserDataPath: () => ipcMain.invoke('get-user-data-path'),
  getLogoDataUrl: (fileName) => ipcMain.invoke('get-logo-data-url', fileName),

  // SDK functions
  ...sdkPreloader,
  validateConnectionTokens: (environment: any) => ipcMain.invoke('validate-connection-tokens', environment),
});