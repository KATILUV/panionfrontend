/**
 * Clara AI Export Script
 * 
 * This script creates a complete export package of the Clara AI application
 * for deployment or sharing. It includes all necessary files and instructions.
 * 
 * To use this script:
 * 1. Make sure archiver is installed: npm install archiver
 * 2. Run this script: node export-clara.js
 * 3. Download the resulting ZIP from the export folder
 */

// Use ESM import syntax to match the project's setup
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

// Get current file directory (ESM compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const OUTPUT_DIR = './export';
const EXPORT_FILENAME = 'clara-ai-export.zip';
const README_CONTENT = `# Clara AI Companion

## Overview
Clara is an AI companion with a beautiful interface, advanced memory capabilities, and support for text and image interactions.

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- An OpenAI API key (or Anthropic API key if using Claude)

### Installation
1. Extract this ZIP archive
2. Run \`npm install\` to install dependencies
3. Create a \`.env\` file with your API keys (see .env.example)
4. Run \`npm run build\` to build the application
5. Run \`npm start\` to start the application

### Environment Variables
Create a .env file with:
\`\`\`
OPENAI_API_KEY=your_openai_key_here
# Optional: ANTHROPIC_API_KEY=your_anthropic_key_here
PORT=5000 # Optional: defaults to 5000
\`\`\`

## Features
- Text conversations with memory
- Image analysis capabilities
- Beautiful orb interface with animations
- Responsive design for all devices

## Technology
- React + TypeScript frontend
- Express backend
- OpenAI GPT-4o integration
- Custom memory system

## License
This package is for personal use only.
`;

// Create directories if they don't exist
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// Main export function
async function exportClara() {
  console.log('🔮 Starting Clara AI export process...');
  
  // Create output directory
  ensureDirectoryExists(OUTPUT_DIR);
  
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
  
  // Create README.md
  const readmePath = path.join(OUTPUT_DIR, 'README.md');
  fs.writeFileSync(readmePath, README_CONTENT);
  archive.file(readmePath, { name: 'README.md' });
  
  // Create .env.example
  const envExamplePath = path.join(OUTPUT_DIR, '.env.example');
  fs.writeFileSync(envExamplePath, 'OPENAI_API_KEY=your_openai_key_here\n# ANTHROPIC_API_KEY=your_anthropic_key_here\nPORT=5000\n');
  archive.file(envExamplePath, { name: '.env.example' });
  
  // Add package.json (modified copy)
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  // Ensure start script exists and build script exists
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.start = packageJson.scripts.start || 'node server/index.js';
  packageJson.scripts.build = packageJson.scripts.build || 'vite build';
  
  const packageJsonPath = path.join(OUTPUT_DIR, 'package.json');
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  archive.file(packageJsonPath, { name: 'package.json' });
  
  // Add main code directories
  const directoriesToInclude = [
    'client',
    'server',
    'shared',
    'clara_memory',
    'public'
  ];
  
  const filesToInclude = [
    'tsconfig.json',
    'vite.config.ts',
    'tailwind.config.ts',
    'postcss.config.js',
    'memories.json',
    'drizzle.config.ts',
    'components.json',
    '.gitignore'
  ];
  
  // Add directories
  for (const dir of directoriesToInclude) {
    if (fs.existsSync(dir)) {
      archive.directory(dir, dir);
    }
  }
  
  // Add individual files
  for (const file of filesToInclude) {
    if (fs.existsSync(file)) {
      archive.file(file, { name: file });
    }
  }
  
  // Finalize the archive
  await archive.finalize();
  
  console.log(`🎉 Export complete! Your Clara AI package is ready at: ${path.join(OUTPUT_DIR, EXPORT_FILENAME)}`);
  console.log('📋 Instructions are included in the README.md file within the archive.');
}

// Run the export
exportClara().catch(error => {
  console.error('Export failed:', error);
  process.exit(1);
});