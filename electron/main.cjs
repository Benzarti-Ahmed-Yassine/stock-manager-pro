const { app, BrowserWindow, ipcMain, Notification, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

// Répertoire des données par défaut : %APPDATA%/BoutiqueInformatiqueSAV/
const defaultUserDataPath = app.getPath('userData');
const configFilePath = path.join(defaultUserDataPath, 'app_config.json');

function getConfig() {
  try {
    if (fs.existsSync(configFilePath)) {
      return JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
    }
  } catch (err) {
    console.error('Erreur lecture config:', err);
  }
  return {
    dataPath: path.join(defaultUserDataPath, 'boutique_data.json'),
    backupPath: path.join(defaultUserDataPath, 'backups'),
    backupCount: 7,
  };
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erreur écriture config:', err);
  }
}

let currentConfig = null;

function getDataFilePath() {
  if (!currentConfig) currentConfig = getConfig();
  return currentConfig.dataPath;
}

function getBackupDir() {
  if (!currentConfig) currentConfig = getConfig();
  const dir = currentConfig.backupPath || path.join(defaultUserDataPath, 'backups');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Fonction de rotation des sauvegardes (JSON, Excel et SQLite)
function rotateBackups(backupDir, maxCount) {
  try {
    ['.json', '.xlsx', '.sqlite'].forEach(ext => {
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup_') && f.endsWith(ext))
        .map(f => ({
          name: f,
          time: fs.statSync(path.join(backupDir, f)).mtimeMs,
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > maxCount) {
        files.slice(maxCount).forEach(f => {
          try {
            fs.unlinkSync(path.join(backupDir, f.name));
          } catch (_) {}
        });
      }
    });
  } catch (err) {
    console.error('Erreur rotation backups:', err);
  }
}

function createWindow() {
  currentConfig = getConfig();

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    title: "Boutique Informatique & SAV",
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, '../public/logo.png'),
  });

  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// IPC Handlers pour la persistance fichier, Excel, SQLite et sauvegardes
ipcMain.handle('get-storage-info', async () => {
  const cfg = getConfig();
  const filePath = getDataFilePath();
  const excelPath = filePath.replace(/\.json$/i, '.xlsx');
  const sqlitePath = filePath.replace(/\.json$/i, '.sqlite');
  const exists = fs.existsSync(filePath);
  const excelExists = fs.existsSync(excelPath);
  const sqliteExists = fs.existsSync(sqlitePath);
  let size = 0;
  let lastModified = null;
  if (exists) {
    const stats = fs.statSync(filePath);
    size = stats.size;
    lastModified = stats.mtime.toISOString();
  }
  return {
    filePath,
    excelPath,
    sqlitePath,
    backupDir: getBackupDir(),
    exists,
    excelExists,
    sqliteExists,
    size,
    lastModified,
    config: cfg,
  };
});

ipcMain.handle('load-file-data', async () => {
  try {
    const filePath = getDataFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, data: JSON.parse(content) };
    }
    return { success: false, message: 'Fichier non trouvé' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-file-data', async (event, payload) => {
  try {
    const data = payload && payload.data ? payload.data : payload;
    const excelBase64 = payload && payload.excelBase64 ? payload.excelBase64 : null;
    const sqliteBase64 = payload && payload.sqliteBase64 ? payload.sqliteBase64 : null;
    const filePath = getDataFilePath();
    const backupDir = getBackupDir();
    const jsonStr = JSON.stringify(data, null, 2);

    // 1. Écrire le fichier principal JSON
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, jsonStr, 'utf-8');

    // 2. Écrire le fichier principal Excel (.xlsx) pour ouverture directe dans Microsoft Excel
    const excelPath = filePath.replace(/\.json$/i, '.xlsx');
    if (excelBase64) {
      fs.writeFileSync(excelPath, Buffer.from(excelBase64, 'base64'));
    }

    // 3. Écrire la Base de Données Relationnelle SQLite (.sqlite & .db)
    const sqlitePath = filePath.replace(/\.json$/i, '.sqlite');
    const dbPath = filePath.replace(/\.json$/i, '.db');
    if (sqliteBase64) {
      const sqliteBuffer = Buffer.from(sqliteBase64, 'base64');
      fs.writeFileSync(sqlitePath, sqliteBuffer);
      fs.writeFileSync(dbPath, sqliteBuffer);
    }

    // 4. Créer une copie de réplication / backup JSON, Excel et SQLite
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFile = path.join(backupDir, `backup_${dateStr}.json`);
    fs.writeFileSync(backupFile, jsonStr, 'utf-8');

    if (excelBase64) {
      const backupExcel = path.join(backupDir, `backup_${dateStr}.xlsx`);
      fs.writeFileSync(backupExcel, Buffer.from(excelBase64, 'base64'));
    }

    if (sqliteBase64) {
      const backupSqlite = path.join(backupDir, `backup_${dateStr}.sqlite`);
      fs.writeFileSync(backupSqlite, Buffer.from(sqliteBase64, 'base64'));
    }

    // 5. Rotation des backups (garder les N derniers)
    const cfg = getConfig();
    rotateBackups(backupDir, cfg.backupCount || 7);

    return { success: true, filePath, excelPath, sqlitePath, backupFile };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-data-folder', async () => {
  const dir = path.dirname(getDataFilePath());
  shell.openPath(dir);
  return true;
});

ipcMain.handle('open-excel-file', async () => {
  const excelPath = getDataFilePath().replace(/\.json$/i, '.xlsx');
  if (fs.existsSync(excelPath)) {
    shell.openPath(excelPath);
    return true;
  }
  return false;
});

ipcMain.handle('open-sqlite-file', async () => {
  const sqlitePath = getDataFilePath().replace(/\.json$/i, '.sqlite');
  if (fs.existsSync(sqlitePath)) {
    shell.openPath(sqlitePath);
    return true;
  }
  return false;
});

ipcMain.handle('set-storage-config', async (event, newConfig) => {
  try {
    const cfg = { ...getConfig(), ...newConfig };
    saveConfig(cfg);
    currentConfig = cfg;
    return { success: true, config: cfg };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('show-native-notification', async (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'Boutique Informatique & SAV',
      body: body || '',
      icon: path.join(__dirname, '../public/logo.png'),
    }).show();
    return true;
  }
  return false;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
