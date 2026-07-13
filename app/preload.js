const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    closeApp: () => ipcRenderer.send('app:quit'),
    minimizeApp: () => ipcRenderer.send('app:minimize'),
    getSettings: () => ipcRenderer.invoke('config:get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('config:save-settings', settings),
    getCommands: () => ipcRenderer.invoke('config:get-commands'),
    saveCommands: (commands) => ipcRenderer.invoke('config:save-commands', commands),
    getWorkspace: () => ipcRenderer.invoke('config:get-workspace'),
    saveWorkspace: (workspace) => ipcRenderer.invoke('config:save-workspace', workspace),
    getAnimation: () => ipcRenderer.invoke('config:get-animation'),
    saveAnimation: (animation) => ipcRenderer.invoke('config:save-animation', animation),
    saveEnv: (env) => ipcRenderer.invoke('config:save-env', env),
    getEnv: () => ipcRenderer.invoke('config:get-env'),
    getLogs: () => ipcRenderer.invoke('logs:get'),
    expandOverlay: () => ipcRenderer.send('overlay:expand'),
    collapseOverlay: () => ipcRenderer.send('overlay:collapse'),
    restartEngine: () => ipcRenderer.send('engine:restart'),
    relaunchApp: () => ipcRenderer.send('app:relaunch')
});
