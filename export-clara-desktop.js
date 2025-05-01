/**
 * Clara Desktop Export Script
 * 
 * This script will create a ZIP file containing all the necessary files
 * to convert the Clara vanilla.html version into a desktop application.
 * 
 * Usage:
 * 1. Run this script: node export-clara-desktop.js
 * 2. A zip file (clara-desktop-export.zip) will be created
 * 3. Extract the zip and follow the README.md instructions
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Function to create directory if it doesn't exist
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// Function to copy file
function copyFile(source, destination) {
  fs.copyFileSync(source, destination);
  console.log(`Copied: ${source} -> ${destination}`);
}

// Function to copy directory recursively
function copyDirectory(source, destination) {
  ensureDirectoryExists(destination);
  
  const files = fs.readdirSync(source);
  
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);
    
    const stats = fs.statSync(sourcePath);
    
    if (stats.isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      copyFile(sourcePath, destPath);
    }
  }
}

// Create export directory
const exportDir = path.join(__dirname, 'clara-desktop-export');
ensureDirectoryExists(exportDir);

// Create directory structure
const publicDir = path.join(exportDir, 'public');
const serverDir = path.join(exportDir, 'server');
const iconsDir = path.join(exportDir, 'icons');
ensureDirectoryExists(publicDir);
ensureDirectoryExists(serverDir);
ensureDirectoryExists(iconsDir);

// Copy vanilla.html and its assets
console.log('Copying vanilla.html and assets...');
copyFile(
  path.join(__dirname, 'client/public/vanilla.html'),
  path.join(publicDir, 'index.html')
);

// Copy any CSS and JS files used by vanilla.html
// This assumes they're in the same directory
const vanillaDir = path.join(__dirname, 'client/public');
if (fs.existsSync(path.join(vanillaDir, 'vanilla.css'))) {
  copyFile(
    path.join(vanillaDir, 'vanilla.css'),
    path.join(publicDir, 'vanilla.css')
  );
}
if (fs.existsSync(path.join(vanillaDir, 'vanilla.js'))) {
  copyFile(
    path.join(vanillaDir, 'vanilla.js'),
    path.join(publicDir, 'vanilla.js')
  );
}

// Copy any other assets needed (assuming they're in client/public)
// Skip the node_modules folder and package files
console.log('Copying additional assets...');
const publicFiles = fs.readdirSync(vanillaDir);
for (const file of publicFiles) {
  if (file === 'node_modules' || file === 'package.json' || 
      file === 'package-lock.json' || file.startsWith('.')) {
    continue;
  }
  
  const sourcePath = path.join(vanillaDir, file);
  const stats = fs.statSync(sourcePath);
  
  // Skip vanilla.html as it was already copied with a different name
  if (file === 'vanilla.html') {
    continue;
  }
  
  // Copy the file or directory
  if (stats.isDirectory()) {
    copyDirectory(sourcePath, path.join(publicDir, file));
  } else {
    copyFile(sourcePath, path.join(publicDir, file));
  }
}

// Copy server files
console.log('Copying server files...');
copyDirectory(path.join(__dirname, 'server'), serverDir);

// Create Electron main.js
console.log('Creating Electron files...');
fs.writeFileSync(
  path.join(exportDir, 'main.js'),
  `const { app, BrowserWindow, ipcMain, Tray, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { spawn } = require('child_process');
const server = express();
const PORT = 3000;

// Setup for python backend
let pythonProcess = null;
const isProd = app.isPackaged;
const pythonPath = isProd 
  ? path.join(process.resourcesPath, 'python')
  : path.join(__dirname, 'server');

// Handle API requests through Express
server.use(express.json({ limit: '50mb' }));
server.use(express.static(path.join(__dirname, 'public')));

server.listen(PORT, () => {
  console.log(\`Local server running on port \${PORT}\`);
});

let mainWindow;
let tray = null;

function startPythonBackend() {
  // Start Python process
  const pythonExecutable = isProd ? 
    path.join(pythonPath, 'python') : 
    'python';

  pythonProcess = spawn(pythonExecutable, [
    path.join(pythonPath, 'app.py'),
    '--port', PORT.toString()
  ]);

  pythonProcess.stdout.on('data', (data) => {
    console.log(\`Python: \${data.toString()}\`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(\`Python error: \${data.toString()}\`);
  });

  pythonProcess.on('close', (code) => {
    console.log(\`Python process exited with code \${code}\`);
    if (!app.isQuitting) {
      startPythonBackend();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hidden',
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    icon: path.join(__dirname, 'icons/icon.png')
  });

  mainWindow.loadFile('public/index.html');

  // Create system tray
  tray = new Tray(path.join(__dirname, 'icons/tray-icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Clara', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Always on Top', type: 'checkbox', click: (menuItem) => {
        mainWindow.setAlwaysOnTop(menuItem.checked);
      }
    },
    { label: 'Start with System', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({ openAtLogin: menuItem.checked });
      }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Clara AI');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // IPC handlers
  ipcMain.on('minimize', () => mainWindow.minimize());
  ipcMain.on('maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('close', () => mainWindow.hide());
  ipcMain.on('always-on-top', (_, flag) => mainWindow.setAlwaysOnTop(flag));
  
  ipcMain.on('show-notification', (_, { title, body }) => {
    new Notification({ title, body, icon: path.join(__dirname, 'icons/icon.png') }).show();
  });
  
  ipcMain.handle('open-file-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'png', 'gif'] }
      ]
    });
    if (!canceled) {
      return filePaths[0];
    }
    return null;
  });

  // Open links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle window close (hide instead of close)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });
}

app.whenReady().then(() => {
  startPythonBackend();
  createWindow();
  
  // Register global hotkey to show/hide Clara
  const { globalShortcut } = require('electron');
  globalShortcut.register('Alt+Space', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (pythonProcess) {
    pythonProcess.kill();
  }
});`
);

// Create preload.js
fs.writeFileSync(
  path.join(exportDir, 'preload.js'),
  `const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to render process
contextBridge.exposeInMainWorld('electron', {
  // Window control
  minimize: () => ipcRenderer.send('minimize'),
  maximize: () => ipcRenderer.send('maximize'),
  close: () => ipcRenderer.send('close'),
  setAlwaysOnTop: (flag) => ipcRenderer.send('always-on-top', flag),
  
  // System integration
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  
  // App info
  appVersion: process.env.npm_package_version
});

// Set the API endpoint to the local server
contextBridge.exposeInMainWorld('claraConfig', {
  backendUrl: 'http://localhost:3000',
  isDesktop: true
});`
);

// Create package.json
fs.writeFileSync(
  path.join(exportDir, 'package.json'),
  `{
  "name": "clara-desktop",
  "version": "1.0.0",
  "description": "Clara AI Desktop Companion",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "postinstall": "electron-builder install-app-deps"
  },
  "build": {
    "appId": "com.clara.desktop",
    "productName": "Clara AI",
    "mac": {
      "category": "public.app-category.productivity"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Utility"
    },
    "extraResources": [
      {
        "from": "python",
        "to": "python"
      }
    ]
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "electron": "^25.3.1",
    "electron-builder": "^24.6.3"
  }
}`
);

// Create modified README.md with instructions
fs.writeFileSync(
  path.join(exportDir, 'README.md'),
  `# Clara Desktop Application

This package contains everything you need to convert Clara from a web application into a desktop app using Electron.

## Setup Instructions

1. Install Node.js (v16 or higher) if you don't have it already
2. Install Python (v3.9 or higher) if you don't have it already
3. Open a terminal in this directory and run:

\`\`\`bash
# Install dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Start the app
npm start
\`\`\`

## Building the Desktop App

To create installer packages for your operating system:

\`\`\`bash
npm run build
\`\`\`

This will create installers in the \`dist\` folder.

## Features

- Global hotkey (Alt+Space) to show/hide Clara
- System tray icon for quick access
- Start with system option
- Always on top mode
- Native notifications
- System file picker integration

## Folder Structure

- \`/public\` - Clara's frontend files
- \`/server\` - Clara's backend Python server
- \`/icons\` - Application icons
- \`main.js\` - Electron main process
- \`preload.js\` - Secure bridge between Electron and web content

## Adding Python Dependencies

Add any Python dependencies you need to the requirements.txt file.
`
);

// Create requirements.txt for Python dependencies
const reqContents = `flask>=2.0.0
flask-cors>=3.0.10
openai>=1.0.0
pillow>=9.0.0
requests>=2.27.0
`;
fs.writeFileSync(path.join(exportDir, 'requirements.txt'), reqContents);

// Create placeholder icons
// Create a simple SVG icon for placeholder
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ff0080;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#8a2be2;stop-opacity:0.8" />
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="200" fill="url(#grad)" />
  <circle cx="256" cy="256" r="180" fill="none" stroke="white" stroke-width="4" stroke-opacity="0.3" />
  <circle cx="180" cy="180" r="25" fill="white" fill-opacity="0.3" />
  <circle cx="340" cy="220" r="40" fill="white" fill-opacity="0.2" />
  <circle cx="210" cy="320" r="35" fill="white" fill-opacity="0.2" />
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), iconSvg);
fs.writeFileSync(path.join(iconsDir, 'placeholder.txt'), 
  `Replace these placeholders with proper icons:
  
  1. icon.png - 512x512 app icon (main application icon)
  2. tray-icon.png - 32x32 icon for system tray
  
  You can convert the provided SVG to PNG for temporary use with online tools.`
);

// Create a ZIP archive
console.log('Creating ZIP archive...');
const output = fs.createWriteStream(path.join(__dirname, 'clara-desktop-export.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function() {
  console.log(`Successfully created clara-desktop-export.zip (${(archive.pointer() / 1048576).toFixed(2)} MB)`);
  console.log('Export complete!');
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);
archive.directory(exportDir, false);
archive.finalize();
`