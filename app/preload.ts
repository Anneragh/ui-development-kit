const { contextBridge, ipcRenderer: ipcMain } = require('electron');
const sdkPreloader = require('./sailpoint-sdk/sdk-preload');

contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication and connection
  connectToISC: (apiUrl: any, baseUrl: any, clientId: any, clientSecret: any) => ipcMain.invoke('connect-to-isc', apiUrl, baseUrl, clientId, clientSecret),
  connectToISCWithOAuth: (apiUrl: any, baseUrl: any, accessToken: any) => ipcMain.invoke('connect-to-isc-oauth', apiUrl, baseUrl, accessToken),
  disconnectFromISC: () => ipcMain.invoke('disconnect-from-isc'),
  oauthLogin: (tenant: any, baseAPIUrl: any) => ipcMain.invoke('oauth-login', tenant, baseAPIUrl),
  
  // Environment management
  getTenants: () => ipcMain.invoke('get-tenants'),
  createOrUpdateEnvironment: (config: any) => ipcMain.invoke('create-or-update-environment', config),
  deleteEnvironment: (environmentName: any) => ipcMain.invoke('delete-environment', environmentName),
  setActiveEnvironment: (environmentName: any) => ipcMain.invoke('set-active-environment', environmentName),
  getGlobalAuthType: () => ipcMain.invoke('get-global-auth-type'),
  
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
  ...sdkPreloader
});