import { app, BrowserWindow, ipcMain, dialog, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { scanAndSync } from './lib/scanner';

let mainWindow: BrowserWindow | null = null;
const CONFIG_FILE = path.join(app.getPath('userData'), 'singr-agent-config.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 950,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // During development, load from Vite dev server
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:3014');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built HTML bundle
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// IPC HANDLERS FOR SYSTEM CONFIGURATION
// ==========================================

ipcMain.handle('load-config', async () => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return { apiKey: '', systemNumber: 1, apiUrl: 'http://localhost:3001' };
    }

    const data = JSON.parse(await fs.promises.readFile(CONFIG_FILE, 'utf-8'));
    let apiKey = '';

    if (data.encryptedApiKey) {
      if (safeStorage.isEncryptionAvailable()) {
        const encryptedBuffer = Buffer.from(data.encryptedApiKey, 'base64');
        apiKey = safeStorage.decryptString(encryptedBuffer);
      } else {
        // Fallback if encryption is not supported (e.g. headless environments)
        const decryptedBuffer = Buffer.from(data.encryptedApiKey, 'base64');
        apiKey = decryptedBuffer.toString('utf-8');
      }
    }

    return {
      apiKey,
      systemNumber: data.systemNumber || 1,
      apiUrl: data.apiUrl || 'http://localhost:3001',
    };
  } catch (error) {
    console.error('Failed to load configuration:', error);
    return { apiKey: '', systemNumber: 1, apiUrl: 'http://localhost:3001' };
  }
});

ipcMain.handle('save-config', async (_, config: { apiKey: string; systemNumber: number; apiUrl: string }) => {
  try {
    let encryptedApiKey = '';

    if (config.apiKey) {
      if (safeStorage.isEncryptionAvailable()) {
        const encryptedBuffer = safeStorage.encryptString(config.apiKey);
        encryptedApiKey = encryptedBuffer.toString('base64');
      } else {
        // Fallback base64
        encryptedApiKey = Buffer.from(config.apiKey).toString('base64');
      }
    }

    const data = {
      encryptedApiKey,
      systemNumber: Number(config.systemNumber) || 1,
      apiUrl: config.apiUrl || 'http://localhost:3001',
    };

    await fs.promises.writeFile(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to save config:', error);
    return { success: false, error: error.message || String(error) };
  }
});

// ==========================================
// IPC HANDLERS FOR FILE SCANNING & DIALOGS
// ==========================================

ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Karaoke Songbook Directory',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0] || null;
});

ipcMain.handle('start-song-scan', async (_, { directoryPath, apiUrl, apiKey, systemNumber }) => {
  if (!mainWindow) return;

  // Run the scanner async to avoid blocking main thread event loop
  scanAndSync(
    directoryPath,
    apiUrl,
    apiKey,
    systemNumber,
    (progress) => {
      if (mainWindow) {
        mainWindow.webContents.send('scan-progress', progress);
      }
    }
  ).catch((err) => {
    if (mainWindow) {
      mainWindow.webContents.send('scan-progress', {
        status: 'failed',
        totalFiles: 0,
        parsedSongs: 0,
        processedSongs: 0,
        errorMessage: err.message || String(err),
      });
    }
  });

  return { started: true };
});

// ==========================================
// IPC HANDLER FOR CONNECTION TESTING
// ==========================================

ipcMain.handle('test-api-connection', async (_, { apiUrl, apiKey, systemNumber }) => {
  try {
    const endpoint = `${apiUrl}/api/v1/legacy/okj/api.php`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'connectionTest',
        api_key: apiKey,
        system_id: Number(systemNumber),
      }),
    });

    const result = (await response.json()) as any;
    if (result && result.connection === 'ok') {
      return { success: true };
    }
    return { success: false, error: result?.errorString || 'Invalid API key or System ID configuration' };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
});
