const { contextBridge, ipcRenderer } = require('electron');

// Securely expose inter-process communication APIs to frontend views
contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
});
