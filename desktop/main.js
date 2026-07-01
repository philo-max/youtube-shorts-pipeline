const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const csv = require('csv-parser');
const { createSyncServer } = require('./server');

let mainWindow;
let syncServer = null;
let syncServerInstance = null;

// Paths config (assuming running from workspace root)
const WORKSPACE_DIR = path.resolve(__dirname, '..');
const CSV_PATH = path.join(WORKSPACE_DIR, 'test-data', 'storyboard.csv');
const THEME_PATH = path.join(WORKSPACE_DIR, 'theme.json');
const DEFAULT_OUTPUT = path.join(WORKSPACE_DIR, 'out', 'video.mp4');

// Render process state tracker
const renderState = {
  status: 'idle',
  progress: 0,
  message: '',
  logs: []
};

function appendRenderLog(type, message) {
  const logEntry = {
    timestamp: new Date().toLocaleTimeString(),
    type,
    message
  };
  renderState.logs.push(logEntry);
  if (renderState.logs.length > 200) renderState.logs.shift();

  // Send to Electron frontend
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('render-log', message);
  }
}

// Helpers for CSV handling
function readStoryboard() {
  return new Promise((resolve) => {
    const results = [];
    if (!fs.existsSync(CSV_PATH)) {
      return resolve([]);
    }
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row) => {
        const keys = Object.keys(row);
        const idKey = keys.find(k => k.includes('编号') || k.toLowerCase().includes('id'));
        const textKey = keys.find(k => k.includes('台词') || k.includes('文案') || k.toLowerCase().includes('text') || k.toLowerCase().includes('script') || k.toLowerCase().includes('subtitles'));
        const imgKey = keys.find(k => k.includes('图片') || k.toLowerCase().includes('image') || k.toLowerCase().includes('pic'));
        
        if (idKey && textKey && imgKey) {
          results.push({
            id: row[idKey].trim(),
            text: row[textKey].trim(),
            image: row[imgKey].trim()
          });
        }
      })
      .on('end', () => resolve(results))
      .on('error', () => resolve([]));
  });
}

function writeStoryboard(items) {
  return new Promise((resolve, reject) => {
    try {
      const header = '镜头编号,解说台词,图片文件名\n';
      const rows = items.map(item => {
        const escapedText = item.text.replace(/"/g, '""');
        const escapedImage = item.image.replace(/"/g, '""');
        return `${item.id},"${escapedText}","${escapedImage}"`;
      }).join('\n');
      
      // Ensure directory exists
      fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
      fs.writeFileSync(CSV_PATH, header + rows, 'utf8');
      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
}

// Helpers for Theme config
function readTheme() {
  return new Promise((resolve) => {
    if (!fs.existsSync(THEME_PATH)) {
      // Default theme object matching client DEFAULT_THEME
      return resolve({
        channelName: '真相馆',
        colors: {
          primary: '#ffcc00',
          secondary: '#8b5cf6',
          background: '#0b0f19',
          text: '#ffffff'
        },
        subtitles: {
          fontSize: 64,
          bottom: 120,
          fontFamily: 'Outfit'
        },
        animations: {
          kenBurns: {
            enabled: true,
            zoomFactor: 1.15
          }
        }
      });
    }
    try {
      const raw = fs.readFileSync(THEME_PATH, 'utf8');
      resolve(JSON.parse(raw));
    } catch (err) {
      resolve({});
    }
  });
}

function writeTheme(config) {
  return new Promise((resolve, reject) => {
    try {
      fs.writeFileSync(THEME_PATH, JSON.stringify(config, null, 2), 'utf8');
      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
}

// Spawns bin/pipeline.js execution
function startRenderPipeline(options) {
  if (renderState.status === 'rendering') return;

  renderState.status = 'rendering';
  renderState.progress = 0;
  renderState.message = '正在初始化流水线...';
  renderState.logs = [];

  appendRenderLog('info', '启动视频编译子进程: node bin/pipeline.js');

  const args = ['bin/pipeline.js'];
  if (options.useLocalTts) {
    args.push('--local-tts');
  }

  // Create environment variables with keys
  const env = { ...process.env };
  if (options.elevenlabsApiKey) env.ELEVENLABS_API_KEY = options.elevenlabsApiKey;
  if (options.voiceId) env.ELEVENLABS_VOICE_ID = options.voiceId;
  if (options.modelId) env.ELEVENLABS_MODEL_ID = options.modelId;
  if (options.outputName) {
    env.OUTPUT_PATH = path.resolve(WORKSPACE_DIR, options.outputName);
  }

  const child = spawn('node', args, {
    cwd: WORKSPACE_DIR,
    env
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      appendRenderLog('info', line);

      // Parse Remotion Progress line: Rendering Progress: XX%
      if (line.includes('Rendering Progress:')) {
        const match = line.match(/Rendering Progress:\s*(\d+)%/i);
        if (match) {
          const progressVal = parseInt(match[1], 10);
          renderState.progress = progressVal;
          renderState.message = `正在渲染视频帧 (${progressVal}%)`;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('render-progress', {
              progress: progressVal / 100,
              message: renderState.message
            });
          }
        }
      } else if (line.startsWith('[Step')) {
        renderState.message = line;
        // Map steps to a baseline progress for visual feedback
        let stepProgress = 0.1;
        if (line.includes('2/5')) stepProgress = 0.25;
        else if (line.includes('3/5')) stepProgress = 0.4;
        else if (line.includes('4/5')) stepProgress = 0.6;
        else if (line.includes('5/5')) stepProgress = 0.8;

        renderState.progress = Math.round(stepProgress * 100);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('render-progress', {
            progress: stepProgress,
            message: line
          });
        }
      }
    }
  });

  child.stderr.on('data', (data) => {
    const errLine = data.toString().trim();
    if (errLine) {
      appendRenderLog('error', errLine);
    }
  });

  child.on('close', (code) => {
    if (code === 0) {
      renderState.status = 'success';
      renderState.progress = 100;
      renderState.message = '完成渲染';
      
      const outPath = options.outputName || 'out/video.mp4';
      const absoluteOut = path.resolve(WORKSPACE_DIR, outPath);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('render-success', {
          outputPath: absoluteOut,
          duration: 30 // Approximate or parsed from logs
        });
      }
    } else {
      renderState.status = 'failed';
      renderState.progress = 0;
      renderState.message = `任务失败，代码: ${code}`;
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('render-error', `子进程退出，退出代码: ${code}`);
      }
    }
  });
}

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

// Window Management
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "YouTube Shorts Studio",
    icon: path.join(WORKSPACE_DIR, 'assets', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Remove default menu bar
  mainWindow.setMenuBarVisibility(false);

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in dev mode
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(WORKSPACE_DIR, 'client', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Setup IPC handlers
function registerIpcHandlers() {
  ipcMain.handle('load-storyboard', async () => {
    return await readStoryboard();
  });

  ipcMain.handle('save-storyboard', async (event, items) => {
    return await writeStoryboard(items);
  });

  ipcMain.handle('load-theme', async () => {
    return await readTheme();
  });

  ipcMain.handle('save-theme', async (event, config) => {
    return await writeTheme(config);
  });

  ipcMain.handle('start-render', async (event, options) => {
    startRenderPipeline(options);
    return true;
  });

  ipcMain.handle('get-ip-address', async () => {
    return getLocalIp();
  });

  ipcMain.handle('get-server-status', async () => {
    return { running: !!syncServerInstance, port: 4000 };
  });

  ipcMain.handle('toggle-server', async (event, start) => {
    if (start) {
      if (!syncServerInstance) {
        syncServer = createSyncServer({
          getStoryboard: readStoryboard,
          saveStoryboard: writeStoryboard,
          getTheme: readTheme,
          saveTheme: writeTheme,
          triggerRender: startRenderPipeline,
          getRenderState: () => renderState
        });
        
        syncServerInstance = syncServer.listen(4000, '0.0.0.0', () => {
          console.log('Mobile sync server running on port 4000');
        });
      }
    } else {
      if (syncServerInstance) {
        syncServerInstance.close();
        syncServerInstance = null;
        syncServer = null;
      }
    }
    return { running: !!syncServerInstance, port: 4000 };
  });

  ipcMain.handle('open-directory', async (event, folderPath) => {
    const { shell } = require('electron');
    const fullPath = path.resolve(WORKSPACE_DIR, folderPath);
    shell.openPath(fullPath);
    return fullPath;
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (syncServerInstance) {
      syncServerInstance.close();
    }
    app.quit();
  }
});
