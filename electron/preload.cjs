const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getStorageInfo: () => ipcRenderer.invoke('get-storage-info'),
  loadFileData: () => ipcRenderer.invoke('load-file-data'),
  saveFileData: (data) => ipcRenderer.invoke('save-file-data', data),
  setStorageConfig: (config) => ipcRenderer.invoke('set-storage-config', config),
  showNotification: (payload) => ipcRenderer.invoke('show-native-notification', payload),
});
