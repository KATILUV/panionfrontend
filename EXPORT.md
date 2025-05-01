# Clara Export Packages

This project includes two export options for deploying or sharing Clara outside of Replit:

## 1. Full Web Application Package

The **clara-ai-export.zip** package contains the complete Clara application with React frontend and Express backend.

### To create this package:

```bash
node export-clara.js
```

### Contents:
- Frontend code (React, TypeScript, Tailwind CSS)
- Backend code (Express)
- Memory system
- Configurations and dependencies

### Requirements for users:
- Node.js 18+ and npm
- OpenAI API key

## 2. Desktop Application Package

The **clara-desktop-export.zip** package contains an Electron application version of Clara that can run on Windows, Mac, or Linux.

### To create this package:

```bash
node export-clara-desktop.js
```

### Contents:
- Electron application configuration
- Clara web interface
- Building scripts for various platforms

### Requirements for users:
- Node.js 18+ and npm
- OpenAI API key
- Electron for development/building

## Accessing the Export Packages

Both packages are created in the `export/` directory of this project. In Replit, you can:

1. Navigate to the "Files" panel
2. Open the "export" folder
3. Right-click on the desired ZIP file and select "Download"

## Setting Up After Export

Each package contains its own README.md with detailed setup instructions for end users.