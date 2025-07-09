import { app, BrowserWindow, ipcMain, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as url from 'url';
import {
  connectToISC,
  connectToISCWithOAuth,
  disconnectFromISC,
  getTenants,
  harborPilotTransformChat,
  OAuthLogin,
  createOrUpdateEnvironment,
  deleteEnvironment,
  setActiveEnvironment,
  getGlobalAuthType,
} from './api';
import { setupSailPointSDKHandlers } from './sailpoint-sdk/ipc-handlers';

let win: BrowserWindow | null = null;
const args = process.argv.slice(1),
  serve = args.some((val) => val === '--serve');

function getConfigPath(): string {
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'config.json');
  return configPath;
}

function ensureConfigDir(): void {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

function createWindow(): BrowserWindow {
  const size = screen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: size.width / 2,
    height: size.height / 2,
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
      allowRunningInsecureContent: serve,
      contextIsolation: true,

      //enableRemoteModule: false,
    },
  });

  if (serve) {
    (async () => {
      try {
        require('electron-reloader')(module);
      } catch (err) {
        console.error('Failed to enable reloader:', err);
      }
    })();
    win.loadURL('http://localhost:4200');
  } else {
    // Path when running electron executable
    let pathIndex = './index.html';

    if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
      // Path when running electron in local folder
      pathIndex = '../dist/index.html';
    }

    const indexPath = url.format({
      pathname: path.join(__dirname, pathIndex),
      protocol: 'file:',
      slashes: true,
    });

    win.loadURL(indexPath);
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  return win;
}

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
  app.on('ready', () => setTimeout(createWindow, 400));

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

  ipcMain.handle(
    'oauth-login',
    async (event, tenant?: string, baseAPIUrl?: string) => {
      if (!tenant || !baseAPIUrl) {
        throw new Error('Tenant and baseAPIUrl are required');
      }
      return await OAuthLogin({ tenant, baseAPIUrl });
    }
  );

  // Handle fetching users via IPC
  ipcMain.handle(
    'connect-to-isc',
    async (
      event,
      apiUrl: string,
      baseUrl: string,
      clientId: string,
      clientSecret: string
    ) => {
      if (clientId.startsWith('go-keyring-base64:')) {
        const base64 = clientId.split('go-keyring-base64:')[1];
        clientId = atob(base64);
      }

      if (clientSecret.startsWith('go-keyring-base64:')) {
        const base64 = clientSecret.split('go-keyring-base64:')[1];
        clientSecret = atob(base64);
      }

      return await connectToISC(apiUrl, baseUrl, clientId, clientSecret);
    }
  );

  ipcMain.handle(
    'connect-to-isc-oauth',
    async (event, apiUrl: string, baseUrl: string, accessToken: string) => {
      return await connectToISCWithOAuth(apiUrl, baseUrl, accessToken);
    }
  );

  ipcMain.handle('disconnect-from-isc', async () => {
    return await disconnectFromISC();
  });

  ipcMain.handle('get-tenants', async () => {
    return await getTenants();
  });

  setupSailPointSDKHandlers();

  ipcMain.handle('harbor-pilot-transform-chat', async (event, chat) => {
    return await harborPilotTransformChat(chat);
  });

  ipcMain.handle('create-or-update-environment', async (event, config) => {
    return await createOrUpdateEnvironment(config);
  });

  ipcMain.handle(
    'delete-environment',
    async (event, environmentName: string) => {
      return await deleteEnvironment(environmentName);
    }
  );

  ipcMain.handle(
    'set-active-environment',
    async (event, environmentName: string) => {
      return await setActiveEnvironment(environmentName);
    }
  );

  ipcMain.handle('get-global-auth-type', async () => {
    return await getGlobalAuthType();
  });

  ipcMain.handle('read-config', async () => {
    try {
      const configPath = getConfigPath();
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(configData);
      } else {
        const defaultConfig = {
          components: {
            enabled: [],
          },
          version: '1.0.0',
        };

        ensureConfigDir();
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
        return defaultConfig;
      }
    } catch (error) {
      console.error('Error reading config file:', error);
      throw new Error('Failed to read config file');
    }
  });

  ipcMain.handle('write-config', async (event, config) => {
    try {
      const configPath = getConfigPath();
      ensureConfigDir();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return { success: true };
    } catch (error) {
      console.error('Error writing config file:', error);
      throw new Error('Failed to write config file');
    }
  });

  ipcMain.handle('write-logo-file', async (event, buffer, fileName) => {
    const dest = path.join(__dirname, 'assets', 'icons', fileName);
    await fs.promises.writeFile(dest, buffer);
  });
} catch (e) {
  console.error('Error during app initialization', e);
}
