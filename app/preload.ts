import { UpdateEnvironmentRequest } from "./authentication/config";

const { contextBridge, ipcRenderer: ipcMain } = require('electron');
const sdkPreloader = require('./sailpoint-sdk/sdk-preload');

contextBridge.exposeInMainWorld('electronAPI', {
  // Unified authentication and connection
  unifiedLogin: (environment: string) => ipcMain.invoke('unified-login', environment),
  disconnectFromISC: () => ipcMain.invoke('disconnect-from-isc'),
  checkAccessTokenStatus: (environment: string) => ipcMain.invoke('check-access-token-status', environment),
  getCurrentTokenDetails: (environment: string) => ipcMain.invoke('get-current-token-details', environment),
  
  // Token management
  refreshTokens: (environment: string) => ipcMain.invoke('refresh-tokens', environment),
  validateTokens: (environment: string) => ipcMain.invoke('validate-tokens', environment),

  // Environment management
  getTenants: () => ipcMain.invoke('get-tenants'),
  updateEnvironment: (config: UpdateEnvironmentRequest) => ipcMain.invoke('update-environment', config),
  deleteEnvironment: (environment: string) => ipcMain.invoke('delete-environment', environment),
  setActiveEnvironment: (environment: string) => ipcMain.invoke('set-active-environment', environment),
  
  // config file management
  readConfig: () => ipcMain.invoke('read-config'),
  writeConfig: (config: any) => ipcMain.invoke('write-config', config),

  // SDK functions
  ...sdkPreloader,
});
