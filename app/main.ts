import { app, BrowserWindow, ipcMain, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as url from 'url';
import { setupSailPointSDKHandlers } from './sailpoint-sdk/ipc-handlers';
import { disconnectFromISC, getGlobalAuthType, refreshTokens, setGlobalAuthType, unifiedLogin, validateTokens, checkAccessTokenStatus, checkRefreshTokenStatus, getCurrentTokenDetails } from './authentication/auth';
import { deleteEnvironment, getTenants, setActiveEnvironment, updateEnvironment, UpdateEnvironmentRequest } from './authentication/config';
import { getStoredOAuthTokens } from './authentication/oauth';
import { getStoredPATTokens, storeClientCredentials } from './authentication/pat';

let win: BrowserWindow | undefined

const projectRoot = path.resolve(__dirname, '..', 'src'); // adjust if needed
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
        const ignoredPath = path.join(
          __dirname,
          '..',
          'src',
          'assets',
          'icons',
          '*'
        );
        console.log('Ignoring reload on:', ignoredPath);
        require('electron-reloader')(module, {});
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
    win = undefined;
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

  // Unified authentication and connection

  ipcMain.handle('unified-login', async (event, environment: string) => {
    return unifiedLogin(environment);
  });

  ipcMain.handle('disconnect-from-isc', () => {
    return disconnectFromISC();
  });

  ipcMain.handle('check-access-token-status', async (event, environment: string) => {
    return checkAccessTokenStatus(environment);
  });

  ipcMain.handle('check-refresh-token-status', async (event, environment: string) => {
    return checkRefreshTokenStatus(environment);
  });

  ipcMain.handle('get-current-token-details', async (event, environment: string) => {
    return getCurrentTokenDetails(environment);
  });

  // Token management

  ipcMain.handle('refresh-tokens', async (event, environment: string) => {
    return refreshTokens(environment);
  });

  ipcMain.handle('get-stored-oauth-tokens', async (event, environment: string) => {
    return getStoredOAuthTokens(environment);
  });

  ipcMain.handle('get-stored-pat-tokens', async (event, environment: string) => {
    return getStoredPATTokens(environment);
  });

  ipcMain.handle('store-client-credentials', async (event, environment: string, clientId: string, clientSecret: string) => {
    return storeClientCredentials(environment, clientId, clientSecret);
  });

  ipcMain.handle('validate-tokens', async (event, environment: string) => {
    return validateTokens(environment);
  });

  // Environment management

  ipcMain.handle('get-tenants', () => {
    return getTenants();
  });

  ipcMain.handle('update-environment', (event, config: UpdateEnvironmentRequest) => {
    return updateEnvironment(config);
  });

  ipcMain.handle(
    'delete-environment',
    (event, environment: string) => {
      return deleteEnvironment(environment);
    }
  );

  ipcMain.handle(
    'set-active-environment',
    (event, environment: string) => {
      return setActiveEnvironment(environment);
    }
  );

  ipcMain.handle('get-global-auth-type', async () => {
    return getGlobalAuthType();
  });

  ipcMain.handle('set-global-auth-type', async (event, authType: "oauth" | "pat") => {
    return setGlobalAuthType(authType);
  });


  // Config file management

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

  // Logo file management

  ipcMain.handle('write-logo', async (event, buffer, fileName) => {
    try {
      const logoDir = path.join(app.getPath('userData'), 'assets', 'icons');
      await fs.promises.mkdir(logoDir, { recursive: true });

      const dest = path.join(logoDir, fileName);
      await fs.promises.writeFile(dest, buffer);

      return { success: true };
    } catch (error) {
      console.error('Error writing logo file:', error);
      throw new Error('Failed to write logo file');
    }
  });

  ipcMain.handle('check-logo-exists', async (event, fileName: string) => {
    const fullPath = path.join(
      app.getPath('userData'),
      'assets',
      'icons',
      fileName
    );
    return fs.existsSync(fullPath);
  });

  ipcMain.handle('get-user-data-path', () => {
    return app.getPath('userData');
  });

  ipcMain.handle('get-logo-data-url', async (event, fileName) => {
    try {
      const userDataPath = app.getPath('userData');
      const logoPath = path.join(userDataPath, 'assets', 'icons', fileName);
      const buffer = await fs.promises.readFile(logoPath);
      const base64 = buffer.toString('base64');
      const ext = path.extname(fileName).substring(1); // e.g., png
      return `data:image/${ext};base64,${base64}`;
    } catch (err) {
      console.error('Failed to get logo data URL:', err);
      return null;
    }
  });

  // SDK Functions
  setupSailPointSDKHandlers();

} catch (e) {
  console.error('Error during app initialization', e);
}
