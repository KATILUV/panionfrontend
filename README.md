# Clara Desktop Export

This export script will create a complete package for converting your Clara vanilla.html implementation into a desktop application using Electron.

## How to Use

1. **Install required dependency**:
```bash
npm install archiver
```

2. **Run the export script**:
```bash
node export-clara-desktop.js
```

3. **Get the exported package**:
The script will create a `clara-desktop-export.zip` file containing all the necessary files to build the desktop app.

4. **Extract and build**:
Extract the ZIP file, follow the instructions in the included README.md, and you'll have Clara running as a desktop app!

## What's Included in the Export

- Electron main process (main.js)
- Preload script for secure context bridging (preload.js)
- Package.json with build configuration
- Your vanilla Clara HTML, CSS, and JavaScript
- Server files for the backend
- Placeholder icons and instructions for customization
- Detailed README with build instructions

## Features of the Desktop App

- Global hotkey (Alt+Space) to show/hide Clara
- System tray icon for quick access
- Window controls (minimize, close)
- "Always on top" mode
- Start with system option
- Local file system integration
- Native notifications

The desktop app maintains all the functionality of your web version while adding desktop-specific features and convenience.