const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getStorageInfo: () => ipcRenderer.invoke('get-storage-info'),
  loadFileData: () => ipcRenderer.invoke('load-file-data'),
  saveFileData: (payload) => ipcRenderer.invoke('save-file-data', payload),
  setStorageConfig: (config) => ipcRenderer.invoke('set-storage-config', config),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  openExcelFile: () => ipcRenderer.invoke('open-excel-file'),
  openSqliteFile: () => ipcRenderer.invoke('open-sqlite-file'),
  showNotification: (payload) => ipcRenderer.invoke('show-native-notification', payload),
});
