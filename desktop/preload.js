const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadStoryboard: () => ipcRenderer.invoke('load-storyboard'),
  saveStoryboard: (items) => ipcRenderer.invoke('save-storyboard', items),
  loadTheme: () => ipcRenderer.invoke('load-theme'),
  saveTheme: (config) => ipcRenderer.invoke('save-theme', config),
  startRender: (options) => ipcRenderer.invoke('start-render', options),
  
  onRenderLog: (callback) => ipcRenderer.on('render-log', (event, log) => callback(log)),
  onRenderProgress: (callback) => ipcRenderer.on('render-progress', (event, data) => callback(data)),
  onRenderSuccess: (callback) => ipcRenderer.on('render-success', (event, data) => callback(data)),
  onRenderError: (callback) => ipcRenderer.on('render-error', (event, error) => callback(error)),
  
  getIpAddress: () => ipcRenderer.invoke('get-ip-address'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  toggleServer: (start) => ipcRenderer.invoke('toggle-server', start),
  openDirectory: (path) => ipcRenderer.invoke('open-directory', path)
});
