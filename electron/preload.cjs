const { contextBridge } = require('electron');

// We expose a minimal bridge for future Node.js capabilities if needed
// For now, the app is self-contained in the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
