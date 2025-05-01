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

import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

// Get current file directory (ESM compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const OUTPUT_DIR = './export';
const EXPORT_FILENAME = 'clara-desktop-export.zip';
const EXPORT_README = `# Clara Desktop Application

## Overview
This package allows you to run Clara AI as a desktop application using Electron.

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm

### Installation
1. Extract this ZIP archive
2. Run \`npm install\` to install dependencies
3. Create a \`.env\` file with your API keys (see .env.example)
4. Run \`npm start\` to launch the desktop application

### Environment Variables
Create a .env file with:
\`\`\`
OPENAI_API_KEY=your_openai_key_here
# Optional: ANTHROPIC_API_KEY=your_anthropic_key_here
\`\`\`

## Building Distributables
- Run \`npm run make\` to create distributables for your platform
- Find the created packages in the 'out' folder

## Features
- Run Clara AI as a native desktop application
- Full offline capabilities (once loaded)
- System tray integration
- Native notifications

## Technology
- Electron
- HTML/CSS/JavaScript
- OpenAI API integration
`;

// Create directories if they don't exist
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// Copy a file from source to destination
function copyFile(source, destination) {
  fs.copyFileSync(source, destination);
}

// Copy a directory recursively
function copyDirectory(source, destination) {
  ensureDirectoryExists(destination);
  
  const files = fs.readdirSync(source);
  
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);
    
    const stat = fs.statSync(sourcePath);
    
    if (stat.isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      copyFile(sourcePath, destPath);
    }
  }
}

// Main export function
async function exportClaraDesktop() {
  console.log('🔮 Starting Clara Desktop export process...');
  
  // Create output directory
  ensureDirectoryExists(OUTPUT_DIR);
  
  // Create temp directory for files to be zipped
  const tempDir = path.join(OUTPUT_DIR, 'temp_desktop');
  ensureDirectoryExists(tempDir);
  
  // Create README.md
  fs.writeFileSync(path.join(tempDir, 'README.md'), EXPORT_README);
  
  // Create Electron main.js
  const mainJs = `const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let mainWindow;
let tray;

// Check for environment variables
if (!process.env.OPENAI_API_KEY) {
  console.warn("Warning: OPENAI_API_KEY environment variable not set. Some features may not work.");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icons', 'clara-icon.png'),
    title: 'Clara AI Companion',
    backgroundColor: '#050014',
  });

  mainWindow.loadFile('index.html');
  
  // If in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
  
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
  
  // Create tray icon
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icons', 'clara-icon.png'));
  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Clara', click: () => mainWindow.show() },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setToolTip('Clara AI');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Handle API key access from renderer
ipcMain.handle('get-api-key', () => {
  return process.env.OPENAI_API_KEY;
});
`;

  // Create Electron preload.js
  const preloadJs = `window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(\`\${dependency}-version\`, process.versions[dependency]);
  }
});
`;

  // Create package.json for Electron app
  const packageJson = {
    "name": "clara-desktop",
    "version": "1.0.0",
    "description": "Clara AI Companion Desktop App",
    "main": "main.js",
    "scripts": {
      "start": "electron .",
      "make": "electron-forge make"
    },
    "author": "",
    "license": "MIT",
    "devDependencies": {
      "@electron-forge/cli": "^6.4.2",
      "@electron-forge/maker-deb": "^6.4.2",
      "@electron-forge/maker-rpm": "^6.4.2",
      "@electron-forge/maker-squirrel": "^6.4.2",
      "@electron-forge/maker-zip": "^6.4.2",
      "electron": "^28.0.0"
    },
    "dependencies": {
      "dotenv": "^16.3.1",
      "electron-squirrel-startup": "^1.0.0"
    }
  };

  // Write files to temp directory
  fs.writeFileSync(path.join(tempDir, 'main.js'), mainJs);
  fs.writeFileSync(path.join(tempDir, 'preload.js'), preloadJs);
  fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));
  fs.writeFileSync(path.join(tempDir, '.env.example'), 'OPENAI_API_KEY=your_openai_key_here\n# ANTHROPIC_API_KEY=your_anthropic_key_here\n');

  // Create icons directory
  ensureDirectoryExists(path.join(tempDir, 'icons'));
  
  // Create a simple placeholder icon file (would be replaced with a real icon)
  const iconData = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <circle cx="256" cy="256" r="200" fill="url(#grad)" />
      <defs>
        <radialGradient id="grad" cx="256" cy="256" r="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#8A2BE2" />
          <stop offset="100%" stop-color="#FF69B4" />
        </radialGradient>
      </defs>
    </svg>
  `;
  fs.writeFileSync(path.join(tempDir, 'icons', 'clara-icon.svg'), iconData);
  
  // Create a file to stream archive data to
  const output = fs.createWriteStream(path.join(OUTPUT_DIR, EXPORT_FILENAME));
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });
  
  // Listen for archive warnings
  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      console.warn('Warning:', err);
    } else {
      throw err;
    }
  });
  
  // Listen for archive errors
  archive.on('error', function(err) {
    throw err;
  });
  
  // Pipe archive data to the file
  archive.pipe(output);
  
  // Check if we have the vanilla HTML file
  const vanillaHtmlPath = path.join(__dirname, 'client', 'vanilla.html');
  const indexPath = fs.existsSync(vanillaHtmlPath) ? 
    vanillaHtmlPath : 
    path.join(__dirname, 'export', 'vanilla.html');
  
  // Create a simple HTML file if we don't have a vanilla version
  if (!fs.existsSync(indexPath)) {
    const simpleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clara AI Companion</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #050014 0%, #090824 100%);
      color: white;
      display: flex;
      flex-direction: column;
      height: 100vh;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    .container {
      display: flex;
      flex-direction: column;
      flex: 1;
      padding: 20px;
      max-width: 1000px;
      margin: 0 auto;
      width: 100%;
    }
    .title {
      text-align: center;
      font-size: 28px;
      margin-bottom: 20px;
      color: #ffffff;
    }
    .chat-container {
      flex: 1;
      overflow-y: auto;
      margin-bottom: 20px;
      padding: 10px;
    }
    .message {
      margin: 10px 0;
      padding: 10px 15px;
      border-radius: 18px;
      max-width: 80%;
      line-height: 1.5;
    }
    .user-message {
      align-self: flex-end;
      background: linear-gradient(135deg, #ff6b9d 0%, #a93cff 100%);
      margin-left: auto;
      color: white;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 4px 15px rgba(255, 107, 157, 0.15);
    }
    .ai-message {
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.9);
      color: #000;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }
    .input-container {
      display: flex;
      margin-top: auto;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 5px;
    }
    .input-field {
      flex: 1;
      border: none;
      background: transparent;
      padding: 10px 15px;
      font-size: 16px;
      color: white;
      outline: none;
    }
    .send-button {
      background: linear-gradient(135deg, #ff6b9d 0%, #a93cff 100%);
      border: none;
      color: white;
      padding: 10px 20px;
      border-radius: 15px;
      cursor: pointer;
      font-weight: bold;
    }
    .orb-container {
      position: relative;
      height: 200px;
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }
    .orb {
      width: 150px;
      height: 150px;
      background: radial-gradient(circle, rgba(138, 43, 226, 0.8) 0%, rgba(255, 105, 180, 0.8) 100%);
      border-radius: 50%;
      position: relative;
      box-shadow: 0 0 30px rgba(138, 43, 226, 0.5), 0 0 60px rgba(255, 105, 180, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 4s infinite ease-in-out;
    }
    .orb::before {
      content: '';
      position: absolute;
      top: -10px;
      left: -10px;
      right: -10px;
      bottom: -10px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 70%);
      border-radius: 50%;
      z-index: -1;
    }
    .orb-inner {
      width: 90%;
      height: 90%;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, rgba(138, 43, 226, 0.2) 100%);
      border-radius: 50%;
      position: relative;
      overflow: hidden;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    .tagline {
      text-align: center;
      margin-bottom: 20px;
      font-style: italic;
      color: rgba(255, 255, 255, 0.7);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="title">Clara</h1>
    
    <div class="orb-container">
      <div class="orb">
        <div class="orb-inner"></div>
      </div>
    </div>
    
    <div class="tagline">The future isn't artificial — it's intentional</div>
    
    <div class="chat-container" id="chat-container">
      <div class="message ai-message">Hello! I'm Clara, your AI companion. How can I help you today?</div>
    </div>
    
    <div class="input-container">
      <input type="text" class="input-field" id="user-input" placeholder="Type your message..." />
      <button class="send-button" id="send-button">Send</button>
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const chatContainer = document.getElementById('chat-container');
      const userInput = document.getElementById('user-input');
      const sendButton = document.getElementById('send-button');
      
      // Handle sending messages
      function sendMessage() {
        const message = userInput.value.trim();
        if (message) {
          // Add user message to chat
          const userMessageElement = document.createElement('div');
          userMessageElement.classList.add('message', 'user-message');
          userMessageElement.textContent = message;
          chatContainer.appendChild(userMessageElement);
          
          // Clear input
          userInput.value = '';
          
          // Auto scroll to bottom
          chatContainer.scrollTop = chatContainer.scrollHeight;
          
          // Simulate AI response (in a real app, would call your API here)
          setTimeout(() => {
            // Get API key from main process via IPC
            try {
              const { ipcRenderer } = require('electron');
              ipcRenderer.invoke('get-api-key').then(apiKey => {
                if (apiKey) {
                  // Here you would make a real API call to OpenAI
                  simulateResponse("I'm sorry, I'm running in demonstration mode. In a full implementation, I would connect to OpenAI's API using your API key.");
                } else {
                  simulateResponse("I couldn't find your OpenAI API key. Please add it to your .env file.");
                }
              });
            } catch (e) {
              // If not running in Electron, fall back to demo mode
              simulateResponse("I'm just a demo version of Clara. To use the full capabilities, please set up the complete application with your OpenAI API key.");
            }
          }, 1000);
        }
      }
      
      function simulateResponse(text) {
        const aiMessageElement = document.createElement('div');
        aiMessageElement.classList.add('message', 'ai-message');
        aiMessageElement.textContent = text;
        chatContainer.appendChild(aiMessageElement);
        
        // Auto scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
      
      // Event listeners
      sendButton.addEventListener('click', sendMessage);
      userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });
    });
  </script>
</body>
</html>`;
    fs.writeFileSync(path.join(tempDir, 'index.html'), simpleHtml);
  } else {
    // Copy the vanilla HTML file to the temp directory with the name index.html
    fs.copyFileSync(indexPath, path.join(tempDir, 'index.html'));
  }
  
  // Add all files from temp directory
  archive.directory(tempDir, false);
  
  // Finalize the archive
  await archive.finalize();
  
  // Clean up temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });
  
  console.log(`🎉 Export complete! Your Clara Desktop package is ready at: ${path.join(OUTPUT_DIR, EXPORT_FILENAME)}`);
  console.log('📋 Instructions are included in the README.md file within the archive.');
}

// Run the export
exportClaraDesktop().catch(error => {
  console.error('Export failed:', error);
  process.exit(1);
});