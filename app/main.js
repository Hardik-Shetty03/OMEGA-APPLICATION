const { app, BrowserWindow, ipcMain, Tray, Menu, screen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let dashboardWindow = null;
let overlayWindow = null;
let pythonProcess = null;
let tray = null;

const ENGINE_DIR = path.join(__dirname, '..', 'engine');
const SETTINGS_PATH = path.join(ENGINE_DIR, 'config', 'settings.json');
const COMMANDS_PATH = path.join(ENGINE_DIR, 'config', 'commands.json');
const WORKSPACE_PATH = path.join(ENGINE_DIR, 'config', 'workspace.json');
const ANIMATION_PATH = path.join(ENGINE_DIR, 'config', 'animation.json');
const ENV_PATH = path.join(ENGINE_DIR, '.env');

function spawnPythonEngine() {
    console.log('[Electron] Spawning Python Engine...');
    
    let pythonExecutable = path.join(ENGINE_DIR, 'venv', 'Scripts', 'python.exe');
    let pythonArgs = [path.join(ENGINE_DIR, 'main.py')];

    // If packaged, PyInstaller output will be loaded directly
    const prodExecutable = path.join(__dirname, '..', 'engine_dist', 'main.exe');
    if (fs.existsSync(prodExecutable)) {
        pythonExecutable = prodExecutable;
        pythonArgs = [];
    }

    console.log(`[Electron] Executable: ${pythonExecutable}`);
    console.log(`[Electron] Args: ${pythonArgs.join(' ')}`);

    pythonProcess = spawn(pythonExecutable, pythonArgs, {
        cwd: ENGINE_DIR,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    pythonProcess.stdout.on('data', (data) => {
        console.log(`[Python Engine STDOUT] ${data.toString().trim()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`[Python Engine STDERR] ${data.toString().trim()}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`[Electron] Python process exited with code ${code}`);
    });
}

function killPythonEngine() {
    if (pythonProcess) {
        console.log('[Electron] Terminating Python Engine...');
        pythonProcess.kill();
        pythonProcess = null;
    }
}

function createDashboardWindow() {
    dashboardWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        backgroundColor: '#0B0D14',
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    dashboardWindow.loadFile(path.join(__dirname, 'dashboard', 'index.html'));

    dashboardWindow.once('ready-to-show', () => {
        dashboardWindow.show();
    });

    dashboardWindow.on('closed', () => {
        dashboardWindow = null;
    });
}

function createOverlayWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const windowSize = 120;

    // Corner offset (bottom right)
    const x = width - windowSize - 25;
    const y = height - windowSize - 25;

    overlayWindow = new BrowserWindow({
        width: windowSize,
        height: windowSize,
        x: x,
        y: y,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    overlayWindow.loadFile(path.join(__dirname, 'overlay', 'overlay.html'));

    // Enable mouse clickthrough with event forwarding to the document DOM
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });

    overlayWindow.on('closed', () => {
        overlayWindow = null;
    });
}

function createTray() {
    // Create an empty menu or standard menu, using a fallback path since we will design the overlay icon later
    const trayIconPath = path.join(__dirname, 'overlay', 'icon.png');
    
    tray = new Tray(fs.existsSync(trayIconPath) ? trayIconPath : path.join(__dirname, 'package.json'));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Dashboard',
            click: () => {
                if (!dashboardWindow) {
                    createDashboardWindow();
                } else {
                    dashboardWindow.focus();
                }
            }
        },
        {
            label: 'Quit',
            click: () => {
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Omega Voice Assistant');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
        if (!dashboardWindow) {
            createDashboardWindow();
        } else {
            dashboardWindow.focus();
        }
    });
}

ipcMain.on('app:quit', () => {
    app.quit();
});

ipcMain.on('app:minimize', () => {
    if (dashboardWindow) dashboardWindow.minimize();
});

ipcMain.on('overlay:expand', () => {
    if (overlayWindow) {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        const windowWidth = 380;
        const windowHeight = 120;
        const x = width - windowWidth - 25;
        const y = height - windowHeight - 25;
        
        overlayWindow.setBounds({ x, y, width: windowWidth, height: windowHeight });
        overlayWindow.setIgnoreMouseEvents(false);
    }
});

ipcMain.on('overlay:collapse', () => {
    if (overlayWindow) {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        const windowWidth = 120;
        const windowHeight = 120;
        const x = width - windowWidth - 25;
        const y = height - windowHeight - 25;
        
        overlayWindow.setBounds({ x, y, width: windowWidth, height: windowHeight });
        overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    }
});

ipcMain.on('engine:restart', () => {
    console.log('[Electron] Restarting Python Engine...');
    killPythonEngine();
    setTimeout(spawnPythonEngine, 1000);
});

ipcMain.on('app:relaunch', () => {
    console.log('[Electron] Relaunching entire OMEGA application...');
    killPythonEngine();
    app.relaunch();
    app.exit(0);
});

ipcMain.handle('config:get-settings', async () => {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const data = fs.readFileSync(SETTINGS_PATH, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Error reading settings config:', e);
    }
    return {};
});

ipcMain.handle('config:save-settings', async (event, settings) => {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error('Error saving settings config:', e);
        return false;
    }
});

ipcMain.handle('config:get-commands', async () => {
    try {
        if (fs.existsSync(COMMANDS_PATH)) {
            const data = fs.readFileSync(COMMANDS_PATH, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Error reading commands config:', e);
    }
    return {};
});

ipcMain.handle('config:save-commands', async (event, commands) => {
    try {
        fs.writeFileSync(COMMANDS_PATH, JSON.stringify(commands, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error('Error saving commands config:', e);
        return false;
    }
});

ipcMain.handle('config:get-workspace', async () => {
    try {
        if (fs.existsSync(WORKSPACE_PATH)) {
            const data = fs.readFileSync(WORKSPACE_PATH, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Error reading workspace config:', e);
    }
    return {};
});

ipcMain.handle('config:save-workspace', async (event, workspace) => {
    try {
        fs.writeFileSync(WORKSPACE_PATH, JSON.stringify(workspace, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error('Error saving workspace config:', e);
        return false;
    }
});

ipcMain.handle('config:get-animation', async () => {
    try {
        if (fs.existsSync(ANIMATION_PATH)) {
            const data = fs.readFileSync(ANIMATION_PATH, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Error reading animation config:', e);
    }
    return {};
});

ipcMain.handle('config:save-animation', async (event, animation) => {
    try {
        fs.writeFileSync(ANIMATION_PATH, JSON.stringify(animation, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error('Error saving animation config:', e);
        return false;
    }
});

ipcMain.handle('config:get-env', async () => {
    try {
        if (fs.existsSync(ENV_PATH)) {
            const content = fs.readFileSync(ENV_PATH, 'utf-8');
            const lines = content.split('\n');
            const env = {};
            lines.forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    env[parts[0].trim()] = parts.slice(1).join('=').trim();
                }
            });
            return env;
        }
    } catch (e) {
        console.error('Error reading .env file:', e);
    }
    return {};
});

ipcMain.handle('config:save-env', async (event, env) => {
    try {
        let content = '';
        for (const [key, val] of Object.entries(env)) {
            content += `${key}=${val}\n`;
        }
        fs.writeFileSync(ENV_PATH, content, 'utf-8');
        return true;
    } catch (e) {
        console.error('Error saving .env file:', e);
        return false;
    }
});

ipcMain.handle('logs:get', async () => {
    try {
        const logPath = path.join(ENGINE_DIR, 'omega.log');
        if (fs.existsSync(logPath)) {
            const data = fs.readFileSync(logPath, 'utf-8');
            // Extract the last 15 lines of activities, newer first
            return data.split('\n').filter(Boolean).slice(-15).reverse();
        }
    } catch (e) {
        console.error('Error reading log file:', e);
    }
    return [];
});

app.whenReady().then(() => {
    spawnPythonEngine();
    createDashboardWindow();
    createOverlayWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createDashboardWindow();
            createOverlayWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Run in tray background
    }
});

app.on('will-quit', () => {
    killPythonEngine();
});

process.on('exit', () => {
    killPythonEngine();
});
