# Clara AI Export Package

This README explains how to export the Clara AI application for deployment outside of Replit.

## Export Instructions

1. Make sure you have first installed the required dependency by running:
   ```
   npm install archiver
   ```

2. Run the export script:
   ```
   node export-clara.js
   ```

3. The export will create a folder called `export` in the root directory containing:
   - `clara-ai-export.zip` - The complete application package
   - `README.md` - Instructions included in the zip package
   - `.env.example` - Example environment variables file

4. Download the `clara-ai-export.zip` file from the `export` folder.

5. You can then share, deploy, or save this package.

## What's Included

The export package contains:
- All project code (client, server, shared folders)
- Configuration files (tsconfig.json, vite config, etc.)
- Dependencies list (package.json)
- Setup instructions
- Environment variable examples

## After Exporting

Once exported, users of your package will need to:
1. Extract the archive
2. Run `npm install` to install dependencies
3. Create a `.env` file with their OpenAI API key
4. Run `npm run build` to build the application
5. Run `npm start` to start Clara AI

## Note

This export package is meant for personal use or for sharing with those who have their own OpenAI API keys.